<script lang="ts">
	import type { DemoAccount } from '$lib/types/demo-account';
	import { checkBrowserApiHealth } from '$lib/api/check-api-health';
	import { authClient } from '$lib/auth/client';
	import { completeAuthSignIn } from '$lib/auth/complete-sign-in';
	import ApiConnectionBanner from '$lib/components/auth/ApiConnectionBanner.svelte';
	import AuthScreenShell from '$lib/components/auth/AuthScreenShell.svelte';
	import { t } from '$lib/i18n';
	import { appPath } from '$lib/navigation/app-navigation';
	import { toast } from '$lib/toast.svelte';
	import { onMount } from 'svelte';

	let demoAccounts = $state<DemoAccount[]>([]);
	let devAuthPassword = $state('');
	let loading = $state(false);
	let apiStatus = $state<'checking' | 'connected' | 'disconnected'>('checking');
	let accountsReady = $state(false);
	let accountsError = $state(false);

	async function signInWithRetry(emailAddress: string, password: string) {
		const maxAttempts = 3;
		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const { error } = await authClient.signIn.email({ email: emailAddress, password });
			if (!error) {
				return null;
			}
			const retryable = /user not found/i.test(error.message ?? '') && attempt < maxAttempts - 1;
			if (!retryable) {
				return error;
			}
			await new Promise(resolve => setTimeout(resolve, 1_000));
		}
		return { message: 'User not found' };
	}

	onMount(() => {
		void (async () => {
			try {
				const { DEV_DEMO_LOGIN_ACCOUNTS, DEV_AUTH_PASSWORD } = await import('@edaya/web-fixtures/demo-login');
				demoAccounts = DEV_DEMO_LOGIN_ACCOUNTS;
				devAuthPassword = DEV_AUTH_PASSWORD;
			}
			catch {
				accountsError = true;
				accountsReady = true;
				apiStatus = 'disconnected';
				return;
			}

			accountsReady = true;

			for (let attempt = 0; attempt < 5; attempt++) {
				const health = await checkBrowserApiHealth();
				if (health.connected) {
					apiStatus = 'connected';
					return;
				}
				await new Promise(resolve => setTimeout(resolve, 800));
			}
			apiStatus = 'disconnected';
		})();
	});

	async function signIn(account: DemoAccount) {
		if (apiStatus !== 'connected') {
			toast.error($t('auth.apiUnavailableLocal'));
			return;
		}

		loading = true;
		try {
			const error = await signInWithRetry(account.email, devAuthPassword);

			if (error) {
				toast.error(`${$t('auth.demoSignInFailed')}: ${error.message}`);
				return;
			}

			await completeAuthSignIn($t('auth.demoWelcome', { name: account.name }));
		}
		catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			toast.error(`${$t('auth.demoSignInFailed')}: ${message}`);
		}
		finally {
			loading = false;
		}
	}
</script>

<AuthScreenShell title={$t('auth.demoPageTitle')} subtitle={$t('auth.demoPageSubtitle')}>
	<ApiConnectionBanner connected={apiStatus !== 'disconnected'} />

	<h2 class="mb-1 font-display text-base font-semibold">{$t('auth.pickAccount')}</h2>
	<p class="mb-4 text-xs text-muted-foreground">{$t('auth.demoHint')}</p>
	<p class="mb-4 text-xs text-muted-foreground">
		{$t('auth.demoStaffOnlyHint')}
	</p>

	{#if !accountsReady}
		<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
	{:else if accountsError || demoAccounts.length === 0}
		<p class="text-sm text-destructive">{$t('auth.demoAccountsUnavailable')}</p>
	{:else}
		<ul class="space-y-2">
			{#each demoAccounts as account (account.staffId)}
				<li>
					<button
						type="button"
						onclick={() => signIn(account)}
						disabled={loading || apiStatus !== 'connected'}
						class="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition hover:border-primary/20 hover:bg-secondary/50 disabled:pointer-events-none disabled:opacity-50"
					>
						<span
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground"
						>
							{account.initials}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-medium">{account.name}</span>
							<span class="font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
								{$t(`staff.role.${account.role}`)}
							</span>
						</span>
						<span class="text-xs font-medium text-accent-foreground/80">{$t('auth.continue')}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#snippet footer()}
		<a
			href={appPath('/login')}
			class="text-muted-foreground transition hover:text-primary hover:underline"
		>
			{$t('auth.backToSignIn')}
		</a>
	{/snippet}
</AuthScreenShell>

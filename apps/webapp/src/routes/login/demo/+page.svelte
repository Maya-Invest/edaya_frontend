<script lang="ts">
	import type { DemoAccount } from '$lib/types/demo-account';
	import { dev } from '$app/environment';
	import { resolve } from '$app/paths';
	import { checkBrowserApiHealth } from '$lib/api/check-api-health';
	import ApiConnectionBanner from '$lib/components/auth/ApiConnectionBanner.svelte';
	import AuthScreenShell from '$lib/components/auth/AuthScreenShell.svelte';
	import PasswordlessPanel from '$lib/components/auth/login/PasswordlessPanel.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { onMount } from 'svelte';

	let accounts = $state<DemoAccount[]>([]);
	let accountsReady = $state(false);
	let accountsError = $state(false);
	let selected = $state<DemoAccount | null>(null);
	let contact = $state('');
	let apiConnected = $state(false);
	let apiChecking = $state(true);

	onMount(() => {
		if (!dev)
			return;
		void (async () => {
			try {
				const { DEV_DEMO_LOGIN_ACCOUNTS } = await import('@edaya/web-fixtures/demo-login');
				accounts = DEV_DEMO_LOGIN_ACCOUNTS;
			}
			catch {
				accountsError = true;
			}
			finally {
				accountsReady = true;
			}
		})();
		void (async () => {
			const health = await checkBrowserApiHealth();
			apiConnected = health.connected;
			apiChecking = false;
		})();
	});

	function choose(account: DemoAccount) {
		contact = account.email;
		selected = account;
	}
</script>

<AuthScreenShell title={$t('auth.demoPageTitle')} subtitle={$t('auth.demoPageSubtitle')}>
	{#if selected}
		<div class="mb-4 space-y-1" data-testid="demo-selected-account">
			<h2 class="font-display text-base font-semibold">{selected.name}</h2>
			<p class="text-sm text-muted-foreground">{$t(`staff.role.${selected.role}`)}</p>
		</div>
		<ApiConnectionBanner connected={apiConnected} checking={apiChecking} />
		{#key selected.staffId}
			<PasswordlessPanel bind:email={contact} {apiConnected} />
		{/key}
		<Button data-testid="demo-change-account" variant="link" class="mt-4 w-full" onclick={() => {
			selected = null;
			contact = '';
		}}>{$t('auth.chooseAnotherDemoAccount')}</Button>
	{:else}
		<h2 class="mb-1 font-display text-base font-semibold">{$t('auth.pickAccount')}</h2>
		<p class="mb-4 text-sm text-muted-foreground">{$t('auth.demoHint')}</p>
		<p class="mb-4 text-xs text-muted-foreground">{$t('auth.demoStaffOnlyHint')}</p>
		{#if !accountsReady}
			<p role="status" class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
		{:else if accountsError || accounts.length === 0}
			<p role="alert" class="text-sm text-destructive">{$t('auth.demoAccountsUnavailable')}</p>
		{:else}
			<ul class="space-y-2" data-testid="demo-account-list">
				{#each accounts as account (account.staffId)}
					<li>
						<Button data-testid="demo-account" data-account-id={account.staffId} variant="outline" class="h-auto w-full gap-3 rounded-xl py-3 text-left" onclick={() => choose(account)}>
							<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-sm font-semibold text-primary-foreground" aria-hidden="true">{account.initials}</span>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm font-medium">{account.name}</span>
								<span class="block text-xs text-muted-foreground">{$t(`staff.role.${account.role}`)}</span>
							</span>
							<span class="text-xs text-primary">{$t('auth.continue')}</span>
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}

	{#snippet footer()}
		<a href={resolve('/login')} class="text-muted-foreground transition hover:text-primary hover:underline">{$t('auth.backToSignIn')}</a>
	{/snippet}
</AuthScreenShell>

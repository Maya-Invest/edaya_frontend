<script lang="ts">
	import type { LoginMethodId } from '$lib/auth/login-methods';
	import type { AuthSplitPanel } from '$lib/components/auth/AuthSplitShell.svelte';
	import { browser } from '$app/environment';
	import { checkBrowserApiHealth } from '$lib/api/check-api-health';
	import { DEFAULT_LOGIN_METHOD_ID } from '$lib/auth/login-methods';
	import ApiConnectionBanner from '$lib/components/auth/ApiConnectionBanner.svelte';
	import AuthSplitShell from '$lib/components/auth/AuthSplitShell.svelte';
	import LoginPanelHost from '$lib/components/auth/login/LoginPanelHost.svelte';
	import SignupPanel from '$lib/components/auth/signup/SignupPanel.svelte';
	import { isDemoLoginEnabled, isPublicSchoolRegistrationEnabled } from '$lib/env/app-env';
	import { t } from '$lib/i18n';
	import { appPath } from '$lib/navigation/app-navigation';

	let apiConnected = $state(false);
	let email = $state('');
	let activeMethod = $state<LoginMethodId>(DEFAULT_LOGIN_METHOD_ID);
	let activePanel = $state<AuthSplitPanel>('signin');

	const showDemoLink = $derived(isDemoLoginEnabled());
	const showSignup = $derived(isPublicSchoolRegistrationEnabled());

	$effect(() => {
		if (!browser) {
			return;
		}

		void (async () => {
			const health = await checkBrowserApiHealth();
			apiConnected = health.connected;
		})();
	});

	function handleMethodChange(method: LoginMethodId) {
		activeMethod = method;
	}

	function handleSwitchToSignIn(prefillEmail: string) {
		if (prefillEmail) {
			email = prefillEmail;
		}
		activePanel = 'signin';
		activeMethod = 'password';
	}
</script>

<AuthSplitShell
	activePanel={activePanel}
	showSignup={showSignup}
	onPanelChange={(panel) => {
		activePanel = panel;
	}}
>
	{#snippet signup()}
		{#if showSignup}
			<SignupPanel
				bind:email
				{apiConnected}
				onSwitchToSignIn={handleSwitchToSignIn}
			/>
		{/if}
	{/snippet}

	{#snippet signin()}
		<ApiConnectionBanner connected={apiConnected} />

		<LoginPanelHost
			bind:email
			{activeMethod}
			{apiConnected}
			onMethodChange={handleMethodChange}
		/>
	{/snippet}

	{#snippet footer()}
		{#if showDemoLink}
			<p class="text-muted-foreground">
				{$t('auth.exploringQuestion')}
				<a
					href={appPath('/login/demo')}
					class="font-medium text-primary hover:underline"
				>
					{$t('auth.demoLoginLink')}
				</a>
			</p>
		{/if}
	{/snippet}
</AuthSplitShell>

<script lang="ts">
	import type { LoginMethodId } from '$lib/auth/login-methods';
	import type { LoginStage } from './login-url-state';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { getAuthenticatedAuthUser } from '$lib/auth/bootstrap';
	import { completeAuthSignIn } from '$lib/auth/complete-sign-in';
	import {
		isGuardianPortalGateUrl,
		GUARDIAN_PORTAL_GATE_BANNER_TEST_ID,
	} from '$lib/auth/guardian-portal-gate';
	import {
		isStudentPortalGateUrl,
		STUDENT_PORTAL_GATE_BANNER_TEST_ID,
	} from '$lib/auth/student-portal-gate';
	import {
		isTeacherPortalGateUrl,
		TEACHER_PORTAL_GATE_BANNER_TEST_ID,
	} from '$lib/auth/teacher-portal-gate';
	import ApiConnectionBanner from '$lib/components/auth/ApiConnectionBanner.svelte';
	import AuthSplitShell from '$lib/components/auth/AuthSplitShell.svelte';
	import LoginPanelHost from '$lib/components/auth/login/LoginPanelHost.svelte';
	import SignupPanel from '$lib/components/auth/signup/SignupPanel.svelte';
	import AppLoading from '$lib/components/layout/AppLoading.svelte';
	import { isDemoLoginEnabled } from '$lib/env/app-env';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { toast } from '$lib/toast.svelte';
	import { onMount } from 'svelte';
	import { loadLoginCapabilities } from './login-capabilities';
	import {
		canonicalLoginUrlState,
		isEmailVerifiedRedirect,
		isInvalidVerificationRedirect,
		isLoginAutoSignInRoute,
		isLoginRoute,
		readLoginUrlState,
		writeLoginUrlState,
	} from './login-url-state';

	let apiConnected = $state(false);
	let apiChecking = $state(true);
	let email = $state('');
	let invalidVerificationToastShown = false;
	let completingAutoSignIn = false;
	let sessionAutoSignInChecked = false;
	let checkingSavedSession = $state(true);

	const showDemoLink = $derived(isDemoLoginEnabled());
	let showSignup = $state(false);
	const signupRequested = $derived($page.url.searchParams.get('panel') === 'signup');
	const showSignupPanel = $derived(showSignup || (apiChecking && signupRequested));
	const routedUrlState = $derived(readLoginUrlState($page.url, { showSignup: showSignupPanel }));
	const urlState = $derived(canonicalLoginUrlState(routedUrlState, {
		hasEmailIdentity: email.trim().length > 0,
	}));
	const showTeacherPortalGate = $derived(isTeacherPortalGateUrl($page.url));
	const showGuardianPortalGate = $derived(isGuardianPortalGateUrl($page.url));
	const showStudentPortalGate = $derived(isStudentPortalGateUrl($page.url));

	onMount(() => {
		void (async () => {
			const capability = await loadLoginCapabilities();
			showSignup = capability.publicSignup;
			apiConnected = capability.connected;
			apiChecking = false;
			if (signupRequested && !showSignup)
				void appGoto(writeLoginUrlState($page.url, urlState), { replaceState: true, keepFocus: true, noScroll: true });
		})();
	});

	afterNavigate(async (navigation) => {
		const url = navigation.to?.url ?? $page.url;
		if (!isLoginRoute(url.pathname)) {
			return;
		}

		if (isInvalidVerificationRedirect(url) && !invalidVerificationToastShown) {
			invalidVerificationToastShown = true;
			toast.error($t('auth.invalidVerificationLink'));
		}

		if (isLoginAutoSignInRoute(url.pathname) && !completingAutoSignIn) {
			const verified = isEmailVerifiedRedirect(url);
			if (verified || !sessionAutoSignInChecked) {
				sessionAutoSignInChecked = true;
				try {
					if (verified || await getAuthenticatedAuthUser()) {
						completingAutoSignIn = true;
						const signedIn = await completeAuthSignIn(
							verified ? $t('auth.emailVerifiedSignIn') : $t('auth.welcome'),
						);
						if (signedIn) {
							return;
						}
						completingAutoSignIn = false;
					}
				}
				catch {
					completingAutoSignIn = false;
				}
				finally {
					checkingSavedSession = false;
				}
			}
		}

		if (apiChecking && url.searchParams.get('panel') === 'signup')
			return;
		const canonicalHref = writeLoginUrlState(url, urlState);
		if (canonicalHref !== `${url.pathname}${url.search}`) {
			void appGoto(canonicalHref, {
				replaceState: true,
				keepFocus: true,
				noScroll: true,
			});
		}
	});

	function navigateLoginState(
		patch: Partial<{ panel: 'signin' | 'signup'; method: LoginMethodId; stage: LoginStage }>,
	) {
		const next = { ...urlState, ...patch };
		const href = writeLoginUrlState($page.url, next);
		if (href === `${$page.url.pathname}${$page.url.search}`) {
			return;
		}
		void appGoto(href, {
			keepFocus: true,
			noScroll: true,
		});
	}

	function handleMethodChange(method: LoginMethodId) {
		navigateLoginState({ method, stage: 'form' });
	}

	function handleSwitchToSignIn(prefillEmail: string) {
		if (prefillEmail) {
			email = prefillEmail;
		}
		navigateLoginState({ panel: 'signin', method: 'email-otp', stage: 'form' });
	}
</script>

{#if checkingSavedSession && isLoginAutoSignInRoute($page.url.pathname)}
	<AppLoading />
{:else}
	<AuthSplitShell
		activePanel={urlState.panel}
		showSignup={showSignupPanel}
		onPanelChange={(panel) => {
			navigateLoginState({ panel, stage: 'form' });
		}}
	>
		{#snippet signup()}
			{#if apiChecking}
				<p role="status" class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
			{:else if showSignup}
				<ApiConnectionBanner connected={apiConnected} checking={apiChecking} />
				<SignupPanel
					active={urlState.panel === 'signup'}
					bind:email
					{apiConnected}
					onSwitchToSignIn={handleSwitchToSignIn}
					stage={urlState.panel === 'signup' && urlState.stage === 'verification'
						? 'verification'
						: 'form'}
					onStageChange={stage => navigateLoginState({ panel: 'signup', stage })}
				/>
			{/if}
		{/snippet}

		{#snippet signin()}
			{#if showTeacherPortalGate}
				<div
					class="mb-4 rounded-collection border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
					role="status"
					data-testid={TEACHER_PORTAL_GATE_BANNER_TEST_ID}
				>
					{$t('auth.teacherPortalGateHint')}
				</div>
			{/if}
			{#if showGuardianPortalGate}
				<div
					class="mb-4 rounded-collection border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
					role="status"
					data-testid={GUARDIAN_PORTAL_GATE_BANNER_TEST_ID}
				>
					{$t('auth.guardianPortalGateHint')}
				</div>
			{/if}
			{#if showStudentPortalGate}
				<div
					class="mb-4 rounded-collection border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
					role="status"
					data-testid={STUDENT_PORTAL_GATE_BANNER_TEST_ID}
				>
					{$t('auth.studentPortalGateHint')}
				</div>
			{/if}
			<ApiConnectionBanner connected={apiConnected} checking={apiChecking} />

			<LoginPanelHost
				active={urlState.panel === 'signin'}
				bind:email
				activeMethod={urlState.method}
				{apiConnected}
				onMethodChange={handleMethodChange}
				stage={urlState.panel === 'signin' && urlState.stage === 'code' ? 'code' : 'form'}
				onStageChange={stage => navigateLoginState({ panel: 'signin', stage })}
			/>
		{/snippet}

		{#snippet footer()}
			{#if showDemoLink}
				<p class="text-muted-foreground">
					{$t('auth.exploringQuestion')}
					<a
						href={resolve('/login/demo')}
						class="font-medium text-primary hover:underline"
					>
						{$t('auth.demoLoginLink')}
					</a>
				</p>
			{/if}
		{/snippet}
	</AuthSplitShell>
{/if}

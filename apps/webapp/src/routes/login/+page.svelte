<script lang="ts">
	import type { LoginMethodId } from '$lib/auth/login-methods';
	import type { LoginStage } from './login-url-state';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { checkBrowserApiHealth } from '$lib/api/check-api-health';
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
	import { isDemoLoginEnabled, isPublicSchoolRegistrationEnabled } from '$lib/env/app-env';
	import { t } from '$lib/i18n';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { toast } from '$lib/toast.svelte';
	import { onMount } from 'svelte';
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

	const showDemoLink = $derived(isDemoLoginEnabled());
	const showSignup = $derived(isPublicSchoolRegistrationEnabled());
	const routedUrlState = $derived(readLoginUrlState($page.url, { showSignup }));
	const urlState = $derived(canonicalLoginUrlState(routedUrlState, {
		hasEmailIdentity: email.trim().length > 0,
	}));
	const showTeacherPortalGate = $derived(isTeacherPortalGateUrl($page.url));
	const showGuardianPortalGate = $derived(isGuardianPortalGateUrl($page.url));
	const showStudentPortalGate = $derived(isStudentPortalGateUrl($page.url));

	onMount(() => {
		void (async () => {
			const health = await checkBrowserApiHealth();
			apiConnected = health.connected;
			apiChecking = false;
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
		}

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

<AuthSplitShell
	activePanel={urlState.panel}
	showSignup={showSignup}
	onPanelChange={(panel) => {
		navigateLoginState({ panel, stage: 'form' });
	}}
>
	{#snippet signup()}
		{#if showSignup}
			<ApiConnectionBanner connected={apiConnected} checking={apiChecking} />
			<SignupPanel
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
				class="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
				role="status"
				data-testid={TEACHER_PORTAL_GATE_BANNER_TEST_ID}
			>
				{$t('auth.teacherPortalGateHint')}
			</div>
		{/if}
		{#if showGuardianPortalGate}
			<div
				class="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
				role="status"
				data-testid={GUARDIAN_PORTAL_GATE_BANNER_TEST_ID}
			>
				{$t('auth.guardianPortalGateHint')}
			</div>
		{/if}
		{#if showStudentPortalGate}
			<div
				class="mb-4 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
				role="status"
				data-testid={STUDENT_PORTAL_GATE_BANNER_TEST_ID}
			>
				{$t('auth.studentPortalGateHint')}
			</div>
		{/if}
		<ApiConnectionBanner connected={apiConnected} checking={apiChecking} />

		<LoginPanelHost
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

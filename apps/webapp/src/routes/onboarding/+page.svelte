<script lang="ts">
	import { page } from '$app/stores';
	import { authSession } from '$lib/auth/session.svelte';
	import OnboardingShell from '$lib/components/onboarding/OnboardingShell.svelte';
	import OnboardingStepContent from '$lib/components/onboarding/OnboardingStepContent.svelte';
	import { t } from '$lib/i18n';
	import { onboardingContext } from '$lib/onboarding/context.svelte';
	import {
		OnboardingWizardState,
		setOnboardingWizardState,
	} from '$lib/onboarding/onboarding-wizard-state.svelte';
	import { get } from 'svelte/store';

	const wizard = new OnboardingWizardState(() => $page.url);
	setOnboardingWizardState(wizard);

	const busyMessage = $derived.by(() => {
		if (!wizard.busy) {
			return null;
		}
		if (wizard.provisionPhase === 'bootstrap') {
			return get(t)('onboarding.provision.phase.bootstrap');
		}
		if (wizard.provisionPhase === 'provision' || wizard.currentStep === 4) {
			return get(t)('onboarding.provision.phase.provision');
		}
		return get(t)('onboarding.provision.busy');
	});

	$effect(() => {
		wizard.initAuthUser(authSession.authUserId);
	});

	$effect(() => {
		void wizard.maxReachedStep;
		void $page.url;
		wizard.enforceStepAccess();
		const timer = setInterval(() => wizard.enforceStepAccess(), 250);
		return () => clearInterval(timer);
	});

	$effect(() => {
		void wizard.syncServerStatusOnce();
	});
</script>

{#if onboardingContext.initialized}
	<OnboardingShell
		currentStep={wizard.currentStep}
		maxReachedStep={wizard.maxReachedStep}
		canAdvance={wizard.canAdvance}
		canGoBack={wizard.canGoBack}
		showSkip={wizard.showSkip}
		showContinue={wizard.showContinue}
		showFinish={wizard.showFinish}
		canFinish={wizard.canFinish}
		showSkipOnboarding={wizard.showSkipOnboarding}
		canSkipOnboarding={wizard.canSkipOnboarding}
		busy={wizard.busy}
		busyMessage={busyMessage}
		actionError={wizard.lastActionError}
		provisionProgressVisible={wizard.provisionProgressVisible}
		provisionPercent={wizard.provisionPercent}
		provisionActiveStepId={wizard.provisionActiveStepId}
		provisionCompletedIds={wizard.provisionCompletedIds}
		provisionSteps={wizard.provisionSteps}
		provisionSucceeded={wizard.provisionSucceeded}
		onBack={() => wizard.goBack()}
		onContinue={() => void wizard.goNext()}
		onFinish={() => void wizard.finishOnboarding()}
		onSkipOnboarding={() => void wizard.skipOnboarding()}
		onSkip={() => wizard.skipStep()}
		onStepSelect={step => wizard.navigateToStep(step)}
		onSignOut={() => void wizard.signOut()}
	>
		<OnboardingStepContent step={wizard.currentStep} busy={wizard.busy} />
	</OnboardingShell>
{/if}

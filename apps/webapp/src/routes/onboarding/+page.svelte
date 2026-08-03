<script lang="ts">
	import { page } from '$app/stores';
	import { authSession } from '$lib/auth/session.svelte';
	import OnboardingShell from '$lib/components/onboarding/OnboardingShell.svelte';
	import OnboardingStepContent from '$lib/components/onboarding/OnboardingStepContent.svelte';
	import { onboardingContext } from '$lib/onboarding/context.svelte';
	import {
		OnboardingWizardState,
		setOnboardingWizardState,
	} from '$lib/onboarding/onboarding-wizard-state.svelte';

	const wizard = new OnboardingWizardState(() => $page.url);
	setOnboardingWizardState(wizard);

	$effect(() => {
		wizard.initAuthUser(authSession.authUserId);
	});

	$effect(() => {
		wizard.enforceStepAccess();
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
		canGoBack={wizard.canGoBack && onboardingContext.draft.pathChoiceSubmitted}
		showSkip={wizard.showSkip && onboardingContext.draft.pathChoiceSubmitted}
		showContinue={wizard.showContinue && onboardingContext.draft.pathChoiceSubmitted}
		showFinish={wizard.showFinish && onboardingContext.draft.pathChoiceSubmitted}
		canFinish={wizard.canFinish}
		showSkipOnboarding={wizard.showSkipOnboarding}
		canSkipOnboarding={wizard.canSkipOnboarding}
		busy={wizard.busy}
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

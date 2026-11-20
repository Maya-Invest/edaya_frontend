<script lang="ts">
	import type { OnboardingStep } from '$lib/onboarding/types';
	import type { Snippet } from 'svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { t } from '$lib/i18n';
	import { ArrowLeft } from '$lib/icons';
	import { onboardingFinishCtaKey } from '$lib/onboarding/steps';
	import OnboardingProvisionProgress from './OnboardingProvisionProgress.svelte';
	import OnboardingStepper from './OnboardingStepper.svelte';

	interface ProvisionProgressStepProp {
		id: string;
		labelKey: string;
	}

	interface Props {
		currentStep: OnboardingStep;
		maxReachedStep: OnboardingStep;
		canAdvance: boolean;
		canGoBack: boolean;
		showSkip: boolean;
		showContinue: boolean;
		showFinish?: boolean;
		canFinish?: boolean;
		busy?: boolean;
		busyMessage?: string | null;
		actionError?: string | null;
		provisionProgressVisible?: boolean;
		provisionPercent?: number;
		provisionActiveStepId?: string | null;
		provisionCompletedIds?: string[];
		provisionSteps?: ProvisionProgressStepProp[];
		provisionSucceeded?: boolean;
		bootstrapRecoveryNeeded?: boolean;
		onBack: () => void;
		onContinue: () => void;
		onFinish?: () => void;
		onSkip?: () => void;
		onStepSelect: (step: OnboardingStep) => void;
		onSignOut: () => void;
		showSkipOnboarding?: boolean;
		canSkipOnboarding?: boolean;
		onSkipOnboarding?: () => void;
		children: Snippet;
	}

	const {
		currentStep,
		maxReachedStep,
		canAdvance,
		canGoBack,
		showSkip,
		showContinue,
		showFinish = false,
		canFinish = true,
		busy = false,
		busyMessage = null,
		actionError = null,
		provisionProgressVisible = false,
		provisionPercent = 0,
		provisionActiveStepId = null,
		provisionCompletedIds = [],
		provisionSteps = [],
		provisionSucceeded = false,
		bootstrapRecoveryNeeded = false,
		onBack,
		onContinue,
		onFinish,
		onSkip,
		onStepSelect,
		onSignOut,
		showSkipOnboarding = false,
		canSkipOnboarding = false,
		onSkipOnboarding,
		children,
	}: Props = $props();

	const showProvisionProgress = $derived(
		provisionProgressVisible && provisionSteps.length > 0,
	);
	const finishCtaKey = $derived(onboardingFinishCtaKey(provisionSucceeded, bootstrapRecoveryNeeded));
	const stepsLocked = $derived(busy || provisionSucceeded || bootstrapRecoveryNeeded);
</script>

<div
	class="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-6 pt-2 sm:px-6"
	data-onboarding-step={currentStep}
	data-onboarding-max-step={maxReachedStep}
>
	<section class="rounded-collection border border-border bg-card p-5 shadow-soft sm:p-6">
		<div class="mb-4">
			<OnboardingStepper {currentStep} {maxReachedStep} locked={stepsLocked} {onStepSelect} />
		</div>

		{@render children()}
		<footer class="mt-5 border-t border-border/60 pt-4">
			{#if showProvisionProgress}
				<div class="mb-3">
					<OnboardingProvisionProgress
						percent={provisionPercent}
						activeStepId={provisionActiveStepId}
						completedStepIds={provisionCompletedIds}
						steps={provisionSteps}
						visible={true}
					/>
				</div>
			{:else if busy && busyMessage}
				<p class="mb-3 text-xs text-muted-foreground" aria-live="polite">
					{busyMessage}
				</p>
			{/if}
			{#if actionError}
				<p
					class="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
					role="alert"
				>
					{actionError}
				</p>
			{/if}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex shrink-0 items-center gap-2">
					{#if canGoBack}
						<Button variant="outline" type="button" disabled={busy} onclick={onBack}>
							<ArrowLeft class="h-4 w-4" />
							{$t('onboarding.back')}
						</Button>
					{/if}
				</div>

				<div class="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
					{#if showSkip && onSkip}
						<Button variant="ghost" type="button" disabled={busy} onclick={onSkip}>
							{$t('onboarding.skip')}
						</Button>
					{/if}

					{#if showContinue}
						<Button type="button" disabled={busy || !canAdvance} onclick={onContinue}>
							{$t('onboarding.continue')}
						</Button>
					{/if}

					{#if showFinish && onFinish}
						<Button type="button" disabled={busy || !canFinish} onclick={onFinish}>
							{$t(finishCtaKey)}
						</Button>
					{/if}
				</div>
			</div>
		</footer>
	</section>

	<a href="/account/security" target="_blank" rel="noopener" class="mt-4 px-5 text-sm text-primary sm:px-6">{$t('auth.accountSecurity')}</a>

	<div class="mt-4 flex flex-col items-center gap-2 pb-4 text-center">
		{#if authSession.loginEmail}
			<p class="text-xs text-muted-foreground">
				{$t('onboarding.signedInAs', { email: authSession.loginEmail })}
			</p>
		{/if}
		{#if showSkipOnboarding && onSkipOnboarding}
			<Button
				variant="ghost"
				size="sm"
				type="button"
				disabled={busy || !canSkipOnboarding}
				onclick={onSkipOnboarding}
			>
				{$t('onboarding.skipWizard')}
			</Button>
			{#if currentStep !== 3}
				<p class="max-w-sm text-xs text-muted-foreground">
					{$t('onboarding.skipWizardHint')}
				</p>
			{/if}
		{/if}
		<Button variant="ghost" size="sm" type="button" disabled={busy} onclick={onSignOut}>
			{$t('auth.signOut')}
		</Button>
	</div>
</div>

<script lang="ts">
	import type { OnboardingStep } from '$lib/onboarding/types';
	import { t } from '$lib/i18n';
	import { Check } from '$lib/icons';
	import { ONBOARDING_STEPS } from '$lib/onboarding/steps';
	import { cn } from '$lib/utils';

	interface Props {
		currentStep: OnboardingStep;
		maxReachedStep: OnboardingStep;
		locked?: boolean;
		onStepSelect: (step: OnboardingStep) => void;
	}

	const { currentStep, maxReachedStep, locked = false, onStepSelect }: Props = $props();
</script>

<nav aria-label={$t('onboarding.stepperLabel')} class="w-full">
	<ol class="flex items-start justify-between gap-1 sm:gap-2">
		{#each ONBOARDING_STEPS as step, index (step.id)}
			{@const isCompleted = step.id < currentStep}
			{@const isActive = step.id === currentStep}
			{@const isUpcoming = step.id > currentStep}
			{@const isClickable = !locked && step.id <= maxReachedStep && step.id !== currentStep}

			<li class="flex min-w-0 flex-1 items-start">
				<button
					type="button"
					class={cn(
						'group flex w-full flex-col items-center gap-2 text-center',
						isClickable ? 'cursor-pointer' : 'cursor-default',
					)}
					disabled={!isClickable}
					aria-current={isActive ? 'step' : undefined}
					onclick={() => isClickable && onStepSelect(step.id)}
				>
					<span
						class={cn(
							'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors',
							isCompleted && 'border-primary bg-primary text-primary-foreground',
							isActive && 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20',
							isUpcoming && 'border-border bg-background text-muted-foreground',
							isClickable && 'group-hover:border-primary/60 group-hover:bg-primary/5',
						)}
					>
						{#if isCompleted}
							<Check class="h-4 w-4" />
						{:else}
							{step.id}
						{/if}
					</span>

					<span class="hidden w-full px-1 sm:block">
						<span
							class={cn(
								'block text-xs font-medium leading-tight',
								isActive ? 'text-foreground' : 'text-muted-foreground',
							)}
						>
							{$t(step.labelKey)}
						</span>
					</span>
				</button>

				{#if index < ONBOARDING_STEPS.length - 1}
					<div
						class={cn(
							'mt-[1.125rem] hidden h-0.5 min-w-3 flex-1 rounded-full sm:block',
							step.id < currentStep ? 'bg-primary' : 'bg-border',
						)}
						aria-hidden="true"
					></div>
				{/if}
			</li>
		{/each}
	</ol>

	<p class="mt-3 text-center font-sans tabular-nums text-[10px] uppercase tracking-widest text-muted-foreground sm:hidden">
		{$t('onboarding.stepProgress', { current: currentStep, total: ONBOARDING_STEPS.length })}
	</p>
</nav>

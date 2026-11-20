<script lang="ts">
	import type { OnboardingStep } from '$lib/onboarding/types';
	import { t } from '$lib/i18n';
	import { getOnboardingStepDefinition } from '$lib/onboarding/steps';
	import OnboardingStepCompleteForm from './OnboardingStepCompleteForm.svelte';
	import OnboardingStepSchoolForm from './OnboardingStepSchoolForm.svelte';
	import OnboardingStepStaffForm from './OnboardingStepStaffForm.svelte';
	import OnboardingStepStructureForm from './OnboardingStepStructureForm.svelte';

	interface Props {
		step: OnboardingStep;
		busy?: boolean;
	}

	const { step, busy = false }: Props = $props();

	const definition = $derived(getOnboardingStepDefinition(step));
</script>

<div class="space-y-4">
	<header>
		<p class="font-sans tabular-nums text-[10px] uppercase tracking-widest text-muted-foreground">
			{$t('onboarding.stepProgress', { current: step, total: 4 })}
		</p>
		<h1 class="mt-0.5 font-display text-2xl font-semibold">
			{$t(definition.labelKey)}
		</h1>
		<p class="mt-1 text-sm text-muted-foreground">
			{$t(definition.descriptionKey)}
		</p>
	</header>

	{#if step === 1}
		<OnboardingStepSchoolForm disabled={busy} />
	{:else if step === 2}
		<OnboardingStepStructureForm disabled={busy} />
	{:else if step === 3}
		<OnboardingStepStaffForm disabled={busy} />
	{:else}
		<OnboardingStepCompleteForm />
	{/if}
</div>

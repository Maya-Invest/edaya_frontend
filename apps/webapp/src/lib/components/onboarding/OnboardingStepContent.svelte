<script lang="ts">
	import type { OnboardingStep } from '$lib/onboarding/types';
	import OnboardingStepCompleteForm from '$lib/components/onboarding/OnboardingStepCompleteForm.svelte';
	import OnboardingStepSchoolForm from '$lib/components/onboarding/OnboardingStepSchoolForm.svelte';
	import OnboardingStepStaffForm from '$lib/components/onboarding/OnboardingStepStaffForm.svelte';
	import OnboardingStepStructureForm from '$lib/components/onboarding/OnboardingStepStructureForm.svelte';
	import { t } from '$lib/i18n';
	import { getOnboardingStepDefinition } from '$lib/onboarding/steps';

	interface Props {
		step: OnboardingStep;
		busy?: boolean;
	}

	const { step, busy = false }: Props = $props();

	const definition = $derived(getOnboardingStepDefinition(step));
</script>

<div class="space-y-4">
	<header>
		<p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
			{$t('onboarding.stepProgress', { current: step, total: 4 })}
		</p>
		<h1 class="mt-1 font-display text-2xl font-semibold">
			{$t(definition.labelKey)}
		</h1>
		<p class="mt-2 text-sm text-muted-foreground">
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

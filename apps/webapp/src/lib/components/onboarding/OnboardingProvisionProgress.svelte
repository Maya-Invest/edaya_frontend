<script lang="ts">
	import { t } from '$lib/i18n';
	import { Check } from '$lib/icons';
	import { cn } from '$lib/utils';

	interface ProgressStep {
		id: string;
		labelKey: string;
	}

	interface Props {
		percent: number;
		activeStepId: string | null;
		completedStepIds: string[];
		steps: ProgressStep[];
		visible: boolean;
	}

	const {
		percent,
		activeStepId,
		completedStepIds,
		steps,
		visible,
	}: Props = $props();

	const clampedPercent = $derived(Math.max(0, Math.min(100, percent)));
	const completedSet = $derived(new Set(completedStepIds));
	const activeLabel = $derived.by(() => {
		const active = steps.find(step => step.id === activeStepId);
		return active ? $t(active.labelKey) : $t('onboarding.provision.progressTitle');
	});
</script>

{#if visible}
	<div
		class="mb-4 rounded-xl border border-border bg-secondary/20 px-3 py-3 sm:px-4"
		role="status"
		aria-live="polite"
	>
		<div class="mb-2 flex items-center justify-between gap-3">
			<p class="text-xs font-medium text-foreground">
				{$t('onboarding.provision.progressTitle')}
			</p>
			<span class="font-sans tabular-nums text-[10px] tabular-nums text-muted-foreground">
				{Math.round(clampedPercent)}%
			</span>
		</div>

		<div
			class="mb-3 h-2 w-full overflow-hidden rounded-full bg-border"
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(clampedPercent)}
			aria-label={activeLabel}
		>
			<div
				class="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
				style:width="{clampedPercent}%"
			></div>
		</div>

		<p class="mb-2 text-xs text-muted-foreground">
			{activeLabel}
		</p>

		<ol class="space-y-1.5">
			{#each steps as step (step.id)}
				{@const isCompleted = completedSet.has(step.id)}
				{@const isActive = step.id === activeStepId && !isCompleted}
				<li
					class={cn(
						'flex items-center gap-2 text-xs',
						isCompleted && 'text-foreground',
						isActive && 'font-medium text-foreground',
						!isCompleted && !isActive && 'text-muted-foreground',
					)}
				>
					<span
						class={cn(
							'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
							isCompleted && 'border-primary bg-primary text-primary-foreground',
							isActive && 'border-primary bg-primary/10 text-primary',
							!isCompleted && !isActive && 'border-border bg-background',
						)}
						aria-hidden="true"
					>
						{#if isCompleted}
							<Check class="h-3 w-3" />
						{:else if isActive}
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
						{/if}
					</span>
					<span>{$t(step.labelKey)}</span>
				</li>
			{/each}
		</ol>
	</div>
{/if}

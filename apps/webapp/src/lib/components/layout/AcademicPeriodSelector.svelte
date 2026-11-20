<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';

	const { disabled = false }: { disabled?: boolean } = $props();
	const id = $props.id();
	const periods = $derived(academicContext.selectablePeriodsForYear);
</script>

<div class="flex max-w-full flex-wrap items-center gap-2" data-testid="academic-period-selector">
	<label for={id} class="text-xs font-medium text-muted-foreground">{$t('academic.term')}</label>
	{#if periods.length > 0}
		<Select.Root type="single" value={academicContext.periodId} onValueChange={value => value && academicContext.setPeriod(value)}>
			<Select.Trigger {id} disabled={disabled || !academicContext.shellReady} data-testid="academic-period-trigger" data-period-id={academicContext.periodId} aria-label={$t('academic.selectPeriod')} class="w-auto min-w-36 max-w-full gap-2 text-xs">
				<span>{academicContext.period?.label ?? '—'}</span>
			</Select.Trigger>
			<Select.Content class="z-[100] max-h-72 max-w-[calc(100vw-2rem)] overflow-y-auto" align="start">
				{#each periods as period (period.id)}
					<Select.Item value={period.id} label={period.label}>
						<span class="flex flex-wrap items-center gap-x-3 gap-y-1">
							<span>{period.label}</span>
							<span class="font-sans text-xs tabular-nums text-muted-foreground">{period.range}</span>
						</span>
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	{:else}
		<span class="text-xs text-muted-foreground" role="status">{$t('academic.noPeriodsForYear')}</span>
	{/if}
</div>

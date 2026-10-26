<script lang="ts">
	import type { GradeResult } from '../../lib/grading-task';
	import { locale, t } from '$lib/i18n';

	const { result, mode }: { result?: GradeResult; mode: 'original' | 'captured' } = $props();
	const number = (value: number, precision: number | undefined = undefined) => new Intl.NumberFormat($locale, precision === undefined
		? { maximumFractionDigits: 20 }
		: { minimumFractionDigits: precision, maximumFractionDigits: precision }).format(value);
</script>
<div class="space-y-1 break-words text-sm tabular-nums">
	{#if !result}<span>{$t('value.notProvided')}</span>
	{:else if result.designation === 'absent' || result.designation === 'exempt'}<span>{$t(`marks.${result.designation}`)}</span>
	{:else if mode === 'original' && result.originalEntry}
		{#if result.originalEntry.kind === 'numeric'}<span>{number(result.originalEntry.value)} / {number(result.originalEntry.maximum)}</span>
		{:else}<span>{result.originalEntry.code}{result.originalEntry.label ? ` · ${result.originalEntry.label}` : ''}</span>{/if}
	{:else if mode === 'captured' && result.calculation}
		<span>{number(result.calculation.reportedValue, result.calculation.decimalPlaces)} / {number(result.calculation.maximum)} · {$t(`gradeInspection.${result.calculation.units}`)}</span>
		<p>{result.calculation.mention.code}{result.calculation.mention.label ? ` · ${result.calculation.mention.label}` : ''}</p>
	{:else}
		{#if mode === 'original' && result.score != null}<span>{number(result.score)}</span>{/if}
		<p class="text-xs text-muted-foreground">{$t('reportCards.contextUnavailable')}</p>
	{/if}
</div>

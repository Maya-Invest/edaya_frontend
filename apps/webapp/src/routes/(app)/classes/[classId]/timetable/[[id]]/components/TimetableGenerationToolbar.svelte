<script lang="ts">
	import type { TimetablePageState } from '../timetable-page.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { CalendarDays, RotateCcw } from '$lib/icons';
	import TimetableGenerationModal from './TimetableGenerationModal.svelte';
	import TimetablePublishModal from './TimetablePublishModal.svelte';

	const { state: timetablePage }: { state: TimetablePageState } = $props();
	let generateOpen = $state(false);
	let republishOpen = $state(false);
	let publishOpen = $state(false);
	const range = $derived(timetablePage.periodRange);
	const counts = $derived(timetablePage.generatedCounts(range.startDate, range.endDate));
</script>

<div class="mb-4 border-y border-border/70 py-3">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-4 text-sm">
			<span><strong>{counts.draft}</strong> {$t('timetable.drafts')}</span>
			<span><strong>{counts.published}</strong> {$t('timetable.published')}</span>
			<span class="text-muted-foreground">{range.startDate} – {range.endDate}</span>
		</div>
		<PermissionGate permission="TIMETABLE_UPDATE" mode="disable">
			{#snippet children({ disabled })}
				<div class="flex flex-wrap gap-2">
					{#if counts.draft === 0}<Button size="sm" {disabled} onclick={() => (generateOpen = true)}><CalendarDays class="mr-1.5 h-4 w-4" />{$t('timetable.generateDraft')}</Button>{/if}
					{#if counts.draft > 0}<Button size="sm" variant="outline" {disabled} onclick={() => (publishOpen = true)}>{$t('timetable.publish')}</Button>{/if}
					<Button size="sm" variant="outline" {disabled} onclick={() => (republishOpen = true)}><RotateCcw class="mr-1.5 h-4 w-4" />{$t('timetable.republish')}</Button>
				</div>
			{/snippet}
		</PermissionGate>
	</div>
	{#if timetablePage.generationResult}
		<div class="mt-3 text-xs text-muted-foreground">
			{$t('timetable.generationSummary', { placed: timetablePage.generationResult.placements.length, unmet: timetablePage.generationResult.unmetWorkloads.length })}
		</div>
	{/if}
	{#if timetablePage.teacherUnavailabilities.length > 0}
		<div class="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
			<span class="font-medium text-foreground">{$t('timetable.teacherConstraints')}:</span>
			{#each timetablePage.teacherUnavailabilities.slice(0, 4) as rule (rule.id)}
				<span>{rule.dayOfWeek ?? String(rule.startsAt).slice(0, 10)} {rule.startTime ?? ''}–{rule.endTime ?? ''}{rule.reason ? ` · ${rule.reason}` : ''}</span>
			{/each}
		</div>
	{/if}
</div>

<TimetableGenerationModal bind:open={generateOpen} state={timetablePage} mode="generate" />
<TimetableGenerationModal bind:open={republishOpen} state={timetablePage} mode="republish" />
<TimetablePublishModal bind:open={publishOpen} state={timetablePage} />

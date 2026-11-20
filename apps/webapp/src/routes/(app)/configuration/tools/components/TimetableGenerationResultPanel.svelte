<script lang="ts">
	import type {
		GenerateClassResult,
		GenerateSchoolResult,
	} from '$lib/api/mutations/timetable-generation.mutations';
	import { t } from '$lib/i18n';
	import { AlertTriangle, CheckCircle2 } from '$lib/icons';
	import { BADGE_INFO, BADGE_WARN, SURFACE_INFO, SURFACE_WARN } from '$lib/ui-tones';
	import { cn } from '$lib/utils';
	import {
		summarizeClassGeneration,
		summarizeSchoolGeneration,
	} from '../lib/timetable-generation-ui';

	const {
		mode = 'generate',
		classResult = null,
		schoolResult = null,
		subjectLabels = {},
		classLabels = {},
		rangeLabel = '',
	}: {
		mode?: 'generate' | 'school';
		classResult?: GenerateClassResult | null;
		schoolResult?: GenerateSchoolResult | null;
		subjectLabels?: Record<string, string>;
		classLabels?: Record<string, string>;
		rangeLabel?: string;
	} = $props();

	const classSummary = $derived(classResult ? summarizeClassGeneration(classResult) : null);
	const schoolSummary = $derived(schoolResult ? summarizeSchoolGeneration(schoolResult) : null);
	const headlineComplete = $derived(
		mode === 'school'
			? schoolSummary?.isComplete
			: classSummary?.isComplete,
	);
	const warningUnmetCount = $derived(
		mode === 'school'
			? schoolSummary?.unmetCount ?? 0
			: classSummary?.unmetCount ?? 0,
	);
	const hasWarnings = $derived(!headlineComplete);
</script>

<section class="space-y-4" aria-live="polite">
	<div class={cn('rounded-collection border p-4', headlineComplete ? 'border-accent/40 bg-accent/5' : 'border-highlight/40 bg-highlight-soft/40')}>
		<div class="flex items-start gap-3">
			{#if headlineComplete}
				<CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-accent" />
			{:else}
				<AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-highlight" />
			{/if}
			<div class="min-w-0 space-y-1">
				<p class="font-medium text-foreground">
					{headlineComplete ? $t('timetable.resultSuccessTitle') : $t('timetable.resultPartialTitle')}
				</p>
				<p class="text-sm text-muted-foreground">
					{mode === 'school'
						? $t('timetable.resultSchoolDescription', {
							classes: schoolSummary?.classCount ?? 0,
							sessions: schoolSummary?.sessionCount ?? 0,
						})
						: $t('timetable.resultClassDescription', {
							sessions: classSummary?.sessionCount ?? 0,
							unmet: classSummary?.unmetCount ?? 0,
						})}
				</p>
				{#if rangeLabel}
					<p class="text-xs text-muted-foreground">{rangeLabel}</p>
				{/if}
			</div>
		</div>
	</div>

	{#if hasWarnings}
		<div class={cn(SURFACE_WARN, 'space-y-1')}>
			<p class="text-sm font-medium">{$t('timetable.resultWarningsTitle')}</p>
			{#if warningUnmetCount > 0}
				<p class="text-sm text-muted-foreground">
					{mode === 'school'
						? $t('timetable.resultSchoolWarningsHint', { count: warningUnmetCount })
						: $t('timetable.resultClassWarningsHint', { count: warningUnmetCount })}
				</p>
			{/if}
		</div>
	{/if}

	{#if mode === 'school' && schoolSummary && schoolResult}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
			<div class={SURFACE_INFO}>
				<p class="text-xs text-muted-foreground">{$t('timetable.schoolClassCount')}</p>
				<p class="text-lg font-semibold">{schoolSummary.classCount}</p>
			</div>
			<div class={SURFACE_INFO}>
				<p class="text-xs text-muted-foreground">{$t('timetable.generatedSessions')}</p>
				<p class="text-lg font-semibold">{schoolSummary.sessionCount}</p>
			</div>
			<div class={SURFACE_INFO}>
				<p class="text-xs text-muted-foreground">{$t('timetable.lastResult')}</p>
				<p class="text-lg font-semibold">{schoolSummary.placementCount}</p>
			</div>
			<div class={cn(SURFACE_INFO, schoolSummary.unmetCount > 0 && SURFACE_WARN)}>
				<p class="text-xs text-muted-foreground">{$t('timetable.unmetWorkload')}</p>
				<p class="text-lg font-semibold">{schoolSummary.unmetCount}</p>
			</div>
		</div>

		{#if schoolSummary.skippedCount > 0}
			<p class={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', BADGE_WARN)}>
				{$t('timetable.schoolGenerateSkipped', { count: schoolSummary.skippedCount })}
			</p>
		{/if}

		<div class="max-h-56 overflow-y-auto rounded-collection border border-border/70">
			<table class="ui-entry-table w-full text-left text-xs">
				<thead class="sticky top-0 bg-muted/60 text-muted-foreground">
					<tr>
						<th class="px-3 py-2 font-medium">{$t('common.class')}</th>
						<th class="px-3 py-2 font-medium">{$t('timetable.generatedSessions')}</th>
						<th class="px-3 py-2 font-medium">{$t('timetable.unmetWorkload')}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border/60">
					{#each schoolResult.classGroups as row (row.classGroupId)}
						<tr>
							<td class="px-3 py-2 font-medium">{classLabels[row.classGroupId] ?? row.classGroupId}</td>
							<td class="px-3 py-2">{row.sessions.length}</td>
							<td class="px-3 py-2">
								{#if row.unmetWorkloads.length > 0}
									<span class={BADGE_WARN}>{row.unmetWorkloads.length}</span>
								{:else}
									<span class={BADGE_INFO}>0</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else if classSummary && classResult}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
			<div class={SURFACE_INFO}>
				<p class="text-xs text-muted-foreground">{$t('timetable.generatedSessions')}</p>
				<p class="text-lg font-semibold">{classSummary.sessionCount}</p>
			</div>
			<div class={SURFACE_INFO}>
				<p class="text-xs text-muted-foreground">{$t('timetable.lastResult')}</p>
				<p class="text-lg font-semibold">{classSummary.placementCount}</p>
			</div>
			<div class={cn(SURFACE_INFO, classSummary.unmetCount > 0 && SURFACE_WARN)}>
				<p class="text-xs text-muted-foreground">{$t('timetable.unmetWorkload')}</p>
				<p class="text-lg font-semibold">{classSummary.unmetCount}</p>
			</div>
		</div>
		{@render unmetList(classResult.unmetWorkloads)}
	{/if}

	<p class="text-xs text-muted-foreground">{$t('timetable.resultDismissHint')}</p>
</section>

{#snippet unmetList(unmetWorkloads: GenerateClassResult['unmetWorkloads'])}
	{#if unmetWorkloads.length > 0}
		<div class="space-y-2">
			<p class="text-sm font-medium">{$t('timetable.unmetWorkloadDetails')}</p>
			<ul class="max-h-40 space-y-2 overflow-y-auto rounded-collection border border-border/70 p-3 text-xs">
				{#each unmetWorkloads as workload (`${workload.classSubjectId}-${workload.weekKey}`)}
					<li class="flex items-center justify-between gap-3">
						<span class="font-medium">{subjectLabels[workload.classSubjectId] ?? workload.classSubjectId}</span>
						<span class="text-muted-foreground">
							{$t('timetable.unmetWorkloadRow', {
								placed: workload.placed,
								required: workload.required,
								week: workload.weekKey,
							})}
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
{/snippet}

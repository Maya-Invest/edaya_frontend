<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { CalendarDays, Eye } from '$lib/icons';
	import { appGoto } from '$lib/navigation/app-navigation';
	import SchoolTimetableGenerationModal from './components/SchoolTimetableGenerationModal.svelte';
	import SchoolTimetablePublishModal from './components/SchoolTimetablePublishModal.svelte';
	import { TimetablePlanningPageState } from './timetable-planning-page.svelte';

	const planningPage = new TimetablePlanningPageState();
	let generationOpen = $state(false);
	let publishClassId = $state('');
	let publishClassName = $state('');
	let publishOpen = $state(false);
	const academicSelectionKey = $derived(`${academicContext.yearId}|${academicContext.periodId}`);
	const schoolGenerateDisabled = $derived(!planningPage.canGenerateSchoolInitial);

	function loadAcademicSelection(_key: string) {
		planningPage.generationResult = null;
		planningPage.resetRange();
		void planningPage.load().catch(() => undefined);
	}

	$effect(() => {
		loadAcademicSelection(academicSelectionKey);
	});

	function review(classId: string) {
		const url = new URL(detailHref.classPlanning(classId), window.location.origin);
		url.searchParams.set('week', planningPage.range.startDate);
		appGoto(`${url.pathname}${url.search}`);
	}

	function openPublish(classId: string, className: string) {
		publishClassId = classId;
		publishClassName = className;
		publishOpen = true;
	}
</script>

<div class="space-y-5 animate-fade-in">
	<header class="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
		<div>
			<p class="text-xs font-medium uppercase text-muted-foreground">{$t('school.planning')}</p>
			<h1 class="text-2xl font-semibold">{$t('school.timetablePlanning')}</h1>
			<p class="mt-1 text-sm text-muted-foreground">{$t('timetable.countsForAcademicYear', { start: planningPage.academicYearRange.startDate, end: planningPage.academicYearRange.endDate })}</p>
		</div>
		<PermissionGate permission="TIMETABLE_UPDATE" mode="disable">
			{#snippet children({ disabled })}
				<Button disabled={disabled || schoolGenerateDisabled} onclick={() => (generationOpen = true)}><CalendarDays class="mr-1.5 h-4 w-4" />{$t('timetable.generateSchool')}</Button>
			{/snippet}
		</PermissionGate>
	</header>

	<DataState
		status={planningPage.loadStatus === 'error'
			? 'error'
			: planningPage.loadStatus === 'ready' && planningPage.rows.length === 0
			? 'empty'
			: 'ready'}
		errorMessage={planningPage.loadError || $t('dataState.errorDefault')}
		emptyTitle={$t('school.timetablePlanning')}
		emptyDescription={$t('dataState.emptyDescription')}
		preserveShell
	>
		{#if planningPage.loadStatus === 'idle' || planningPage.loadStatus === 'loading'}
			<p class="py-8 text-center text-sm text-muted-foreground">{$t('dataState.loading')}</p>
		{:else}
			<div class="overflow-x-auto border-y border-border">
				<table class="w-full min-w-[760px] text-sm">
					<thead class="bg-muted/40 text-left text-xs text-muted-foreground">
						<tr><th class="px-3 py-2 font-medium">{$t('common.class')}</th><th class="px-3 py-2 font-medium">{$t('timetable.drafts')}</th><th class="px-3 py-2 font-medium">{$t('timetable.published')}</th><th class="px-3 py-2 font-medium">{$t('timetable.lastResult')}</th><th class="px-3 py-2 font-medium">{$t('timetable.unmetWorkload')}</th><th class="px-3 py-2 text-right font-medium">{$t('common.actions')}</th></tr>
					</thead>
					<tbody class="divide-y divide-border/60">
						{#each planningPage.rows as row (row.classGroup.id)}
							<tr>
								<td class="px-3 py-2.5 font-medium">{row.classGroup.name}</td>
								<td class="px-3 py-2.5">{row.draftCount}</td>
								<td class="px-3 py-2.5">{row.publishedCount}</td>
								<td class="px-3 py-2.5">{row.placementCount ?? '—'}</td>
								<td class="px-3 py-2.5">{row.unmetWorkloadCount ?? '—'}</td>
								<td class="px-3 py-2.5">
									<div class="flex justify-end gap-2">
										<Button size="sm" variant="ghost" onclick={() => review(row.classGroup.id)}><Eye class="mr-1 h-4 w-4" />{$t('timetable.review')}</Button>
										<PermissionGate permission="TIMETABLE_UPDATE" mode="disable">
											{#snippet children({ disabled })}
												<Button size="sm" variant="outline" {disabled} onclick={() => openPublish(row.classGroup.id, row.classGroup.name)}>{$t('timetable.publish')}</Button>
											{/snippet}
										</PermissionGate>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</DataState>
</div>

<SchoolTimetableGenerationModal bind:open={generationOpen} state={planningPage} />
<SchoolTimetablePublishModal bind:open={publishOpen} state={planningPage} classGroupId={publishClassId} className={publishClassName} />

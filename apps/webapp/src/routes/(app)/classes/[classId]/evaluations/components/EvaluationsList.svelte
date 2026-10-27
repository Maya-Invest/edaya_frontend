<script lang="ts">
	import type { AssessmentKind, Evaluation } from '$lib/types/school';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import AcademicPeriodSelector from '$lib/components/layout/AcademicPeriodSelector.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { CalendarDays, Clock, Eye, Pencil, Plus } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readClassEvaluationListFilters, writeClassEvaluationListFilters } from '$lib/list/list-url-filters';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appendModal, writeModalSurface } from '$lib/modal/modal-url';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { replaceRouteSurface, currentRouteSurfaceHref, openDetailDrawer } from '$lib/navigation/route-surface-navigation';
	import { cn } from '$lib/utils';
	import { getEvaluationsPageState } from '../evaluations-page.svelte';
	import EvaluationCreateModal from './EvaluationCreateModal.svelte';

	const KIND_FILTERS = ['all', 'homework', 'quiz', 'project', 'other'] as const;
	type KindFilter = (typeof KIND_FILTERS)[number];

	const {
		classId,
		selectedId,
	}: {
		classId: string;
		selectedId?: string;
	} = $props();

	const evaluationsPage = getEvaluationsPageState();
	const evaluations = $derived(evaluationsPage.evaluationsFor(classId));
	const initialFilters = $derived(readClassEvaluationListFilters($page.url));
	type EvaluationRouteModal = 'create' | 'edit' | 'delete' | 'attach' | 'grade-entry';
	const modals = createUrlSyncedModals<EvaluationRouteModal>({
		allowed: () => $page.params.id
			? ['edit', 'delete', 'attach', 'grade-entry']
			: ['create'],
		getUrl: () => $page.url,
	});
	afterNavigate(() => {
		modals.hydrate();
		if (modals.active && modals.active !== 'grade-entry' && modals.target) {
			replaceRouteSurface(writeModalSurface($page.url, { modal: modals.active }));
		}
	});
	const createOpen = bindUrlModal(modals, 'create');

	const listFilters = new ListFiltersState<{ kind: string }>(
		{
			getUrl: () => $page.url,
			write: writeClassEvaluationListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readClassEvaluationListFilters($page.url),
	);

	const kindFilter = $derived(
		KIND_FILTERS.includes(listFilters.values.kind as KindFilter)
			? listFilters.values.kind as KindFilter
			: 'all',
	);

	const filtered = $derived(
		kindFilter === 'all'
			? evaluations
			: evaluations.filter(evaluation => evaluation.kind === kindFilter),
	);

	const kindFilterOptions = $derived(
		KIND_FILTERS.map(value => ({
			value,
			label: value === 'all' ? $t('filter.all') : $t(`eval.kind.${value}`),
		})),
	);

	function handleCreated(assessmentId: string) {
		openDetailDrawer(
			detailHref.classEvaluation(classId, assessmentId),
			currentRouteSurfaceHref($page.url),
		);
	}

	function openEvaluation(evaluation: Evaluation, modal: 'edit' | undefined = undefined) {
		const href = detailHref.classEvaluation(classId, evaluation.id);
		openDetailDrawer(modal ? appendModal(href, modal) : href, currentRouteSurfaceHref($page.url));
	}

	function openEvaluationAction(event: MouseEvent, evaluation: Evaluation, modal: 'edit' | undefined = undefined) {
		event.stopPropagation();
		openEvaluation(evaluation, modal);
	}

	function handleRowKeydown(event: KeyboardEvent, evaluation: Evaluation) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openEvaluation(evaluation);
		}
	}

	function kindBadgeClass(kind: AssessmentKind): string {
		switch (kind) {
			case 'homework':
				return 'bg-highlight/15 text-highlight';
			case 'quiz':
				return 'bg-primary/10 text-primary';
			case 'project':
				return 'bg-accent/15 text-accent';
			default:
				return 'bg-secondary text-muted-foreground';
		}
	}

	function isHomework(evaluation: Evaluation): boolean {
		return evaluation.kind === 'homework';
	}

	function hasScheduleHint(evaluation: Evaluation): boolean {
		return !isHomework(evaluation) && Boolean(evaluation.startsAt || evaluation.lessonSessionId);
	}

	$effect(() => {
		listFilters.hydrate({
			kind: KIND_FILTERS.includes(initialFilters.kind as KindFilter)
				? initialFilters.kind
				: 'all',
		});
	});

	$effect(() => {
		if (!listFilters.ready) {
			return;
		}
		void listFilters.values.kind;
		listFilters.scheduleSync();
	});
</script>

<div class="animate-fade-in">
	<ListPageHeader
		filterCount={[listFilters.values.kind].filter(value => value !== 'all').length}
		onResetFilters={() => listFilters.patchImmediate({ kind: 'all' })}
		eyebrow={$t('eval.marksBook')}
		title={$t('eval.count', { n: filtered.length })}
	>
		{#snippet filters()}
			<AcademicPeriodSelector />
			<FilterSelect
				bind:value={listFilters.values.kind}
				class="h-9 w-44 rounded-full text-xs"
				options={kindFilterOptions}
			/>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onExport={() => void exportMatchingList({
					filename: 'evaluations.csv',
					headers: ['title', 'subject', 'kind', 'date', 'dueDate'],
					loadAll: async () => filtered.map(evaluation => [
						evaluation.title,
						evaluation.subject,
						evaluation.kind,
						evaluation.date,
						evaluation.dueDate ?? '',
					]),
				})}
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="ASSESSMENT_MANAGE"
				{classId}
				mode="disable"
				tooltip={$t('eval.permissionCreate')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"

						disabled={disabled || !academicContext.periodId}
						{title}
						onclick={() => modals.open('create')}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('eval.newEvaluation')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</ListPageHeader>

	<EvaluationCreateModal {classId} bind:open={createOpen.open} onCreated={handleCreated} />

	<div class="space-y-3">
		{#each filtered as evaluation (evaluation.id)}
			{@const active = selectedId === evaluation.id}
			{@const marksAvailable = evaluation.marksAvailable !== false}
			{@const homework = isHomework(evaluation)}
			{@const progress = evaluation.total
				? ((homework ? evaluation.submittedCount : evaluation.graded) / evaluation.total) * 100
				: 0}
			{@const isDone = homework ? evaluation.submittedCount === evaluation.total : evaluation.graded === evaluation.total}
			<div
				role="button"
				tabindex="0"
				onclick={() => openEvaluation(evaluation)}
				onkeydown={event => handleRowKeydown(event, evaluation)}
				class={cn(
					'group grid w-full grid-cols-12 items-center gap-4 rounded-collection border border-border bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-panel',
					active && 'border-primary/40 bg-primary/5',
				)}
			>
				<div class="col-span-5">
					<div class="flex flex-wrap items-center gap-2">
						<p class="font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
							{evaluation.subject}
						</p>
						<span class={cn('rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider', kindBadgeClass(evaluation.kind))}>
							{$t(`eval.kind.${evaluation.kind}`)}
						</span>
					</div>
					<h3 class="mt-1 font-display text-lg font-semibold leading-tight">{evaluation.title}</h3>
					<p class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						<span class="inline-flex items-center gap-1">
							<CalendarDays class="h-3 w-3" />
							{formatLocaleDate(evaluation.date, $locale, {
								day: 'numeric',
								month: 'short',
								year: 'numeric',
							})}
						</span>
						{#if hasScheduleHint(evaluation)}
							<span class="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-sans tabular-nums text-[10px]">
								<Clock class="h-3 w-3" />
								{$t('eval.scheduledHint')}
							</span>
						{/if}
					</p>
				</div>
				{#if homework}
					<div class="col-span-2">
						<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							{$t('hw.due')}
						</p>
						<p class="font-sans tabular-nums text-sm">{evaluation.dueDate ?? evaluation.date}</p>
					</div>
					<div class="col-span-2"></div>
					<div class="col-span-2">
						<div class="flex items-center justify-between text-[11px] text-muted-foreground">
							<span>{$t('drawer.submissions')}</span>
							<span class="font-sans tabular-nums">{marksAvailable ? `${evaluation.submittedCount}/${evaluation.total}` : '—'}</span>
						</div>
						<div class="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary" class:invisible={!marksAvailable}>
							<div
								class={cn('h-full rounded-full', isDone ? 'bg-accent' : 'bg-highlight')}
								style:width="{progress}%"
							></div>
						</div>
					</div>
				{:else}
					<div class="col-span-2">
						<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							{$t('eval.average')}
						</p>
						<p class="font-sans text-2xl font-semibold tabular-nums">
							{marksAvailable && isDone ? evaluation.gradingUpdating ? '—' : evaluation.averageMark.toFixed(evaluation.averagePrecision ?? 2) : '-'}
							<span class="ml-1 text-xs font-normal text-muted-foreground">/ {evaluation.averageOutOf ?? evaluation.outOf}</span>
						</p>
					</div>
					<div class="col-span-2">
						<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							{$t('eval.coefficient')}
						</p>
						<p class="font-sans tabular-nums text-base">x{evaluation.coefficient}</p>
					</div>
					<div class="col-span-2">
						<div class="flex items-center justify-between text-[11px] text-muted-foreground">
							<span>{$t('eval.graded')}</span>
							<span class="font-sans tabular-nums">{marksAvailable ? `${evaluation.graded}/${evaluation.total}` : '—'}</span>
						</div>
						<div class="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary" class:invisible={!marksAvailable}>
							<div
								class={cn('h-full rounded-full', isDone ? 'bg-accent' : 'bg-highlight')}
								style:width="{progress}%"
							></div>
						</div>
					</div>
				{/if}
				<div class="col-span-1 flex justify-end" role="presentation" onclick={event => event.stopPropagation()}>
					<RowActionMenu>
						<RowActionMenuItem onclick={event => openEvaluationAction(event, evaluation)}>
							<Eye class="h-4 w-4 text-muted-foreground" />
							{$t('common.open')}
						</RowActionMenuItem>
						<PermissionGate permission="ASSESSMENT_MANAGE" {classId} subject={evaluation.classSubjectId} subjectId={evaluationsPage.subjectsFor(classId).find(row => row.id === evaluation.classSubjectId)?.subjectId} assessmentId={evaluation.id} mode="disable" tooltip={$t('eval.permissionCreate')}>
							{#snippet children({ disabled, title })}
								<RowActionMenuItem {disabled} {title} onclick={event => openEvaluationAction(event, evaluation, 'edit')}>
									<Pencil class="h-4 w-4 text-muted-foreground" />
									{$t('common.edit')}
								</RowActionMenuItem>
							{/snippet}
						</PermissionGate>
					</RowActionMenu>
				</div>
			</div>
		{/each}
		{#if filtered.length === 0}
			<p
				class="rounded-collection border border-dashed border-border p-10 text-center text-sm text-muted-foreground"
			>
				{$t('eval.none')}
			</p>
		{/if}
	</div>
</div>

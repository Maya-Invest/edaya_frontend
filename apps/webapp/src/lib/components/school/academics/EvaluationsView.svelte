<script lang="ts">
	import type { AssessmentKind, Evaluation } from '$lib/types/school';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { CalendarDays, Clock, Plus } from '$lib/icons';
	import { readClassEvaluationListFilters, writeClassEvaluationListFilters } from '$lib/list/list-url-filters';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import EvaluationCreateModal from './EvaluationCreateModal.svelte';

	const KIND_FILTERS = ['all', 'homework', 'quiz', 'project', 'other'] as const;
	type KindFilter = (typeof KIND_FILTERS)[number];

	const {
		classId,
		onSelect,
		selectedId,
	}: {
		classId: string;
		onSelect?: (e: Evaluation) => void;
		selectedId?: string;
	} = $props();

	const evaluations = $derived(detailDataContext.evaluationsForClass(classId));
	const initialFilters = $derived(readClassEvaluationListFilters($page.url));

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

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

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
		appGoto(detailHref.classEvaluation(classId, assessmentId));
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

	function isHomework(ev: Evaluation): boolean {
		return ev.kind === 'homework';
	}

	function hasScheduleHint(ev: Evaluation): boolean {
		return !isHomework(ev) && Boolean(ev.startsAt || ev.lessonSessionId);
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
		eyebrow={$t('eval.marksBook')}
		title={$t('eval.count', { n: filtered.length })}
	>
		{#snippet filters()}
			<FilterSelect
				bind:value={listFilters.values.kind}
				class="h-9 w-44 rounded-full text-xs"
				options={kindFilterOptions}
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="GRADE_INPUT"
				mode="disable"
				tooltip={$t('eval.permissionCreate')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (createOpen.open = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('eval.newEvaluation')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<EvaluationCreateModal {classId} bind:open={createOpen.open} onCreated={handleCreated} />

	<div class="space-y-3">
		{#each filtered as ev (ev.id)}
			{@const active = selectedId === ev.id}
			{@const homework = isHomework(ev)}
			{@const progress = ev.total
				? ((homework ? ev.submittedCount : ev.graded) / ev.total) * 100
				: 0}
			{@const isDone = homework ? ev.submittedCount === ev.total : ev.graded === ev.total}
			<button
				type="button"
				onclick={() => onSelect?.(ev)}
				class={cn(
					'group grid w-full grid-cols-12 items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-panel',
					active && 'border-primary/40 bg-primary/5',
				)}
			>
				<div class="col-span-5">
					<div class="flex flex-wrap items-center gap-2">
						<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
							{ev.subject}
						</p>
						<span class={cn('rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider', kindBadgeClass(ev.kind))}>
							{$t(`eval.kind.${ev.kind}`)}
						</span>
					</div>
					<h3 class="mt-1 font-display text-lg font-semibold leading-tight">{ev.title}</h3>
					<p class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						<span class="inline-flex items-center gap-1">
							<CalendarDays class="h-3 w-3" />
							{new Date(ev.date).toLocaleDateString($locale, {
								day: 'numeric',
								month: 'short',
								year: 'numeric',
							})}
						</span>
						{#if hasScheduleHint(ev)}
							<span class="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px]">
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
						<p class="font-mono text-sm">{ev.dueDate ?? ev.date}</p>
					</div>
					<div class="col-span-2"></div>
					<div class="col-span-3">
						<div class="flex items-center justify-between text-[11px] text-muted-foreground">
							<span>{$t('drawer.submissions')}</span>
							<span class="font-mono">{ev.submittedCount}/{ev.total}</span>
						</div>
						<div class="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
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
						<p class="font-display text-2xl font-semibold tabular-nums">
							{isDone ? ev.averageMark.toFixed(1) : '—'}
							<span class="ml-1 text-xs font-normal text-muted-foreground">/ {ev.outOf}</span>
						</p>
					</div>
					<div class="col-span-2">
						<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							{$t('eval.coefficient')}
						</p>
						<p class="font-mono text-base">×{ev.coefficient}</p>
					</div>
					<div class="col-span-3">
						<div class="flex items-center justify-between text-[11px] text-muted-foreground">
							<span>{$t('eval.graded')}</span>
							<span class="font-mono">{ev.graded}/{ev.total}</span>
						</div>
						<div class="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
							<div
								class={cn('h-full rounded-full', isDone ? 'bg-accent' : 'bg-highlight')}
								style:width="{progress}%"
							></div>
						</div>
					</div>
				{/if}
			</button>
		{/each}
		{#if filtered.length === 0}
			<p
				class="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground"
			>
				{$t('eval.none')}
			</p>
		{/if}
	</div>
</div>

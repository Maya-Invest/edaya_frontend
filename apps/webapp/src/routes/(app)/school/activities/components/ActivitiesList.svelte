<script lang="ts">
	import type { ListEntityTableColumn } from '$lib/list/list-entity-table-types';
	import type { ListCardColumns, ListView } from '$lib/list/list-view-url';
	import type { Activity } from '$lib/types/school';
	import type { ActivitySortColumn } from '../lib/activity-list-filters';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { fmtActivityDate } from '$lib/components/school/shared/drawer-constants';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListEntityCards from '$lib/components/ui/ListEntityCards.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { CalendarRange, Plus, Users } from '$lib/icons';
	import { loadCardColumnsPreference, saveCardColumnsPreference } from '$lib/list/list-card-columns-preference';
	import {
		isListCardColumns,
		readListCardColumns,
		readListView,
		writeListCardColumns,
		writeListView,
	} from '$lib/list/list-view-url';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { MODAL_QUERY_KEY } from '$lib/modal/modal-url';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import { cn } from '$lib/utils';
	import { getActivitiesPageState } from '../activities-page.svelte';
	import { cycleActivityListSort, filterActivityList } from '../lib/activity-list-filters';
	import ActivityFormModal from './ActivityFormModal.svelte';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (activity: Activity) => void;
		selectedId?: string;
	} = $props();

	const activitiesPage = getActivitiesPageState();
	const view = $derived(readListView($page.url));
	const storedCardColumns = loadCardColumnsPreference('school-activities-card-columns', 3);
	const defaultCardColumns: ListCardColumns = isListCardColumns(storedCardColumns)
		? storedCardColumns
		: 3;
	const cardColumns = $derived(readListCardColumns($page.url, defaultCardColumns));

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	afterNavigate(() => {
		if ($page.url.searchParams.has(MODAL_QUERY_KEY)) {
			return;
		}
		const viewHref = writeListView($page.url, view);
		const canonicalHref = writeListCardColumns(
			new URL(viewHref, $page.url),
			cardColumns,
		);
		if (canonicalHref !== `${$page.url.pathname}${$page.url.search}`) {
			void appGoto(canonicalHref, {
				replaceState: true,
				keepFocus: true,
				noScroll: true,
			});
		}
	});
	const createOpen = bindUrlModal(modals, 'create');

	const categoryKeys = ['all', 'Sport', 'Arts', 'Science', 'Language', 'Wellbeing'] as const;
	const catTone: Record<Activity['category'], string> = {
		Sport: 'bg-secondary text-foreground/80',
		Arts: 'bg-secondary text-foreground/80',
		Science: 'bg-secondary text-foreground/80',
		Language: 'bg-secondary text-foreground/80',
		Wellbeing: 'bg-secondary text-foreground/80',
	};

	const listFilters = $derived.by(() => ({ ...activitiesPage.filters.values }));
	const filtered = $derived(filterActivityList(activitiesPage.activities, listFilters));
	const windowed = useInfiniteList(() => filtered, 30);

	const categoryFilterOptions = $derived(
		categoryKeys.map(key => ({
			value: key,
			label: key === 'all' ? $t('filter.all') : $t(`activities.cat.${key}`),
		})),
	);

	const columns = $derived<ListEntityTableColumn[]>([
		{
			key: 'name',
			label: $t('activities.name'),
			span: 3,
			sortable: true,
			card: { zone: 'header', showLabel: false },
		},
		{
			key: 'category',
			label: $t('activities.category'),
			span: 2,
			sortable: true,
			card: { zone: 'header', showLabel: false, defaultVisible: false },
		},
		{
			key: 'coach',
			label: $t('activities.coach'),
			span: 2,
			sortable: true,
			card: { zone: 'body', showLabel: true },
		},
		{
			key: 'period',
			label: $t('activities.period'),
			span: 3,
			sortable: true,
			card: { zone: 'body', showLabel: true },
		},
		{
			key: 'enrolled',
			label: $t('activities.enrolled'),
			span: 2,
			sortable: true,
			card: { zone: 'footer', showLabel: true },
		},
		{
			key: 'description',
			label: $t('activities.description'),
			span: 1,
			card: { zone: 'body', defaultVisible: false, showLabel: true },
		},
	]);

	function setCardColumns(next: number) {
		if (!isListCardColumns(next)) {
			return;
		}
		saveCardColumnsPreference('school-activities-card-columns', next);
		void appGoto(writeListCardColumns($page.url, next), {
			replaceState: true,
			keepFocus: true,
			noScroll: true,
		});
	}

	function setView(next: ListView) {
		void appGoto(writeListView($page.url, next), {
			replaceState: true,
			keepFocus: true,
			noScroll: true,
		});
	}

	function applyCategoryFilter(value: string) {
		activitiesPage.filters.patchImmediate({ category: value });
	}

	function cycleSort(column: ActivitySortColumn) {
		const next = cycleActivityListSort(listFilters, column);
		activitiesPage.filters.patchImmediate(next);
	}

	function handleCreated(activityId: string) {
		const path = detailHref.schoolActivityTab(activityId, 'classes');
		appGoto(`${path}${detailNavigationSearch($page.url)}`);
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('activities.eyebrow')}
		title={$t('activities.count', { n: filtered.length })}
	>
		{#snippet search()}
			<ListSearchField
				value={activitiesPage.filters.values.q}
				oninput={event => activitiesPage.filters.patch({ q: event.currentTarget.value })}
				placeholder={$t('common.search')}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				value={listFilters.category}
				class="h-9 min-w-[10rem] rounded-full text-xs"
				options={categoryFilterOptions}
				onchange={applyCategoryFilter}
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="DISCIPLINE_CREATE"
				mode="disable"
				tooltip={$t('activities.permissionCreate')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => modals.open('create')}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('activities.newActivity')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu {view} onViewChange={setView} exportLabel={$t('list.export')} />
		{/snippet}
	</ListPageHeader>

	<ActivityFormModal bind:open={createOpen.open} onCreated={handleCreated} />

	{#if view === 'table'}
		<ListEntityTable
			columns={columns.filter(column => column.key !== 'description')}
			rows={windowed.visible}
			highlightId={selectedId}
			sort={{ column: listFilters.sort, dir: listFilters.sortDir }}
			onSort={key => cycleSort(key as ActivitySortColumn)}
			loading={activitiesPage.listLoading}
			hasMore={windowed.hasMore}
			total={windowed.total}
			visibleCount={windowed.visible.length}
			onLoadMore={windowed.loadMore}
			onRowClick={activity => onSelect?.(activity)}
			emptyLabel={$t('activities.none')}
		>
			{#snippet row(activity)}
				<div class="col-span-3 min-w-0">
					<p class="truncate font-display text-sm font-semibold">{activity.name}</p>
				</div>
				<div class="col-span-2">
					<span class={cn('rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider', catTone[activity.category])}>
						{$t(`activities.cat.${activity.category}`)}
					</span>
				</div>
				<div class="col-span-2 truncate text-sm text-foreground/80">{activity.coach}</div>
				<div class="col-span-3 flex items-center gap-1.5 text-xs text-foreground/80">
					<CalendarRange class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					<span class="font-mono tabular-nums">{fmtActivityDate(activity.startDate, $locale)} → {fmtActivityDate(activity.endDate, $locale)}</span>
				</div>
				<div class="col-span-2 flex items-center justify-end gap-1 text-xs">
					<Users class="h-3.5 w-3.5 text-muted-foreground" />
					<span class="font-mono tabular-nums">{activity.enrollments.length}/{activity.capacity}</span>
				</div>
			{/snippet}
		</ListEntityTable>
	{:else}
		<ListEntityCards
			{columns}
			rows={windowed.visible}
			highlightId={selectedId}
			sort={{ column: listFilters.sort, dir: listFilters.sortDir }}
			onSort={key => cycleSort(key as ActivitySortColumn)}
			columnsPerRow={cardColumns}
			onColumnsPerRowChange={setCardColumns}
			loading={activitiesPage.listLoading}
			hasMore={windowed.hasMore}
			total={windowed.total}
			visibleCount={windowed.visible.length}
			onLoadMore={windowed.loadMore}
			onRowClick={activity => onSelect?.(activity)}
			emptyLabel={$t('activities.none')}
		>
			{#snippet field(activity, columnKey)}
				{#if columnKey === 'name'}
					<p class="font-display text-sm font-semibold">{activity.name}</p>
				{:else if columnKey === 'category'}
					<span class={cn('rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider', catTone[activity.category])}>
						{$t(`activities.cat.${activity.category}`)}
					</span>
				{:else if columnKey === 'coach'}
					<p class="truncate text-sm text-foreground/80">{activity.coach}</p>
				{:else if columnKey === 'period'}
					<span class="inline-flex items-center gap-1.5 text-xs text-foreground/80">
						<CalendarRange class="h-3.5 w-3.5 text-muted-foreground" />
						<span class="font-mono tabular-nums">{fmtActivityDate(activity.startDate, $locale)} → {fmtActivityDate(activity.endDate, $locale)}</span>
					</span>
				{:else if columnKey === 'description'}
					<p class="line-clamp-3 text-xs text-muted-foreground">{activity.description}</p>
				{:else if columnKey === 'enrolled'}
					<span class="inline-flex items-center gap-1 text-xs">
						<Users class="h-3.5 w-3.5 text-muted-foreground" />
						<span class="font-mono tabular-nums">{activity.enrollments.length}/{activity.capacity}</span>
					</span>
				{/if}
			{/snippet}
		</ListEntityCards>
	{/if}
</div>

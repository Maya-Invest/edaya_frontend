<script lang="ts">
	import type { ListEntityTableColumn } from '$lib/list/list-entity-table-types';
	import type { Guardian } from '$lib/types/school';
	import type { GuardianSortColumn } from '../lib/guardian-list-filters';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import ListSelectionBar from '$lib/components/ui/ListSelectionBar.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Mail, Phone, Plus, Users } from '$lib/icons';
	import { loadMatchingCollection } from '$lib/list/list-csv-export';
	import { ListSelectionState } from '$lib/list/list-selection-state.svelte';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { DirectoryColumnsState } from '$lib/smart-components/directory-columns/directory-columns-state.svelte';
	import DirectoryColumnData from '$lib/smart-components/directory-columns/DirectoryColumnData.svelte';
	import { cn } from '$lib/utils';
	import { getGuardiansPageState, SCHOOL_GUARDIANS_PAGE_SIZE } from '../guardians-page.svelte';
	import { cycleGuardianListSort, guardianListUsesFullRoster } from '../lib/guardian-list-filters';
	import GuardianCreateModal from './GuardianCreateModal.svelte';

	const { onSelect, selectedId }: {
		onSelect?: (guardian: Guardian) => void;
		selectedId?: string;
	} = $props();
	const guardiansPage = getGuardiansPageState();
	const selection = new ListSelectionState<Guardian>();
	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');
	const usesFullRoster = $derived(guardianListUsesFullRoster(guardiansPage.filters.values));
	const filtered = $derived(guardiansPage.filterVisible(usesFullRoster
		? (guardiansPage.fullRosterGuardians.length > 0
			? guardiansPage.fullRosterGuardians
			: guardiansPage.guardians)
		: guardiansPage.guardians));
	const windowed = useInfiniteList(() => filtered, SCHOOL_GUARDIANS_PAGE_SIZE);
	const listTotal = $derived(usesFullRoster ? filtered.length : guardiansPage.totalGuardians);
	const listLoading = $derived(usesFullRoster ? guardiansPage.loadingFullRoster : guardiansPage.listLoading);
	const listLoadingMore = $derived(usesFullRoster ? false : guardiansPage.listLoadingMore);
	const listHasMore = $derived(usesFullRoster ? windowed.hasMore : guardiansPage.guardians.length < guardiansPage.totalGuardians);
	const listVisible = $derived(usesFullRoster ? windowed.visible : filtered);
	const listVisibleCount = $derived(listVisible.length);
	const selectionPool = $derived([...guardiansPage.guardians, ...guardiansPage.fullRosterGuardians]);
	const directoryColumns = new DirectoryColumnsState('guardian');
	const columns = $derived<ListEntityTableColumn[]>([
		{ key: 'name', label: $t('people.name'), span: 4, sortable: true },
		{ key: 'relation', label: $t('guardian.relationLabel'), span: 2, sortable: true },
		{ key: 'phone', label: $t('common.phone'), span: 3, spanInSelectionMode: 2, sortable: true },
		{ key: 'students', label: $t('students.student'), span: 2, sortable: true },
		{ key: 'actions', label: '', span: 1, required: true },
		...directoryColumns.columns(listVisible).filter(extra => !['name', 'relation', 'phone', 'students', 'actions'].includes(extra.key)),
	]);
	function loadMoreGuardians() {
		if (usesFullRoster) {
			windowed.loadMore();
			return;
		}
		void guardiansPage.loadMore();
	}
	function cycleSort(column: GuardianSortColumn) {
		const next = cycleGuardianListSort(guardiansPage.filters.values, column);
		guardiansPage.filters.patch(next);
		guardiansPage.filters.syncNow();
	}
	function namedGuardian(row: Guardian) {
		return { ...row, studentNames: Object.fromEntries(guardiansPage.linkedStudents(row).map(student => [student.id, student.name])) };
	}
	function exportValue(row: Guardian, key: string) {
		return key === 'students' ? guardiansPage.linkedStudents(row).map(student => student.name).join('; ') : key === 'relation' || key === 'relationshipSummary' ? directoryColumns.value(namedGuardian(row), key) : undefined;
	}
	async function exportSelected() {
		const rows = selection.resolveSelected(selectionPool);
		if (!rows.length)
			return;
		await directoryColumns.exportCsv('guardians-selected.csv', rows, columns, exportValue);
	}
	async function exportMatching() {
		const matching = await loadMatchingCollection({
			isComplete: () => guardiansPage.fullRosterGuardians.length >= guardiansPage.totalGuardians
				|| guardiansPage.guardians.length >= guardiansPage.totalGuardians,
			ensureComplete: () => guardiansPage.loadFullRoster(),
			current: () => guardiansPage.filterVisible(guardiansPage.fullRosterGuardians.length > 0
				? guardiansPage.fullRosterGuardians
				: guardiansPage.guardians),
		});
		await directoryColumns.exportCsv('guardians.csv', matching, columns, exportValue);
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('school.guardians')}
		title={$t('people.guardiansCount', { n: listTotal })}
	>
		{#snippet search()}
			<ListSearchField
				value={guardiansPage.filters.values.q}
				oninput={event => guardiansPage.filters.patch({ q: event.currentTarget.value })}
				placeholder={$t('picker.searchGuardian')}
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="PARENT_MANAGE"
				mode="disable"
				tooltip={$t('guardian.permissionCreate')}
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
						{$t('guardian.addGuardian')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onEnterSelectMode={selection.selectionMode ? undefined : () => selection.enterSelectionMode()}
				onExport={() => void exportMatching()}
			/>
		{/snippet}
	</ListPageHeader>

	<GuardianCreateModal bind:open={createOpen.open} />

	{#if selection.selectionMode}
		<ListSelectionBar
			selectedCount={selection.selectedIds.length}
			onExport={exportSelected}
			onClear={() => selection.exitSelectionMode()}
		/>
	{/if}

	<DirectoryColumnData owner={directoryColumns} rows={listVisible} />
	<ListEntityTable onVisibleColumnsChange={(keys) => {
		directoryColumns.keys = keys;
	}} listKey="GuardiansList"
		{columns}
		rows={listVisible}
		highlightId={selectedId}
		sort={{ column: guardiansPage.filters.values.sort, dir: guardiansPage.filters.values.sortDir }}
		onSort={key => cycleSort(key as GuardianSortColumn)}
		selectionMode={selection.selectionMode}
		selectedIds={selection.selectedIds}
		onToggleSelected={(id, checked) => selection.toggleSelected(id, checked)}
		onToggleAllVisible={checked => selection.toggleVisible(listVisible, checked)}
		allVisibleSelected={selection.allVisibleSelected(listVisible)}
		loading={listLoading}
		loadingMore={listLoadingMore}
		hasMore={listHasMore}
		total={listTotal}
		visibleCount={listVisibleCount}
		onLoadMore={loadMoreGuardians}
		onRowClick={guardian => selection.handleRowClick(guardian, onSelect)}
	>

		{#snippet cell(guardian, column, ctx)}
			{@const linked = guardiansPage.linkedStudents(guardian)}
			{#if column.key === 'name'}
				<div class="col-span-4 flex items-center gap-3">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-xs font-semibold text-primary-foreground"
					>
						{guardian.initials}
					</div>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium">{guardian.name}</p>
						<p class="flex items-center gap-1 truncate text-xs text-muted-foreground">
							<Mail class="h-3 w-3" />
							{guardian.email}
						</p>
					</div>
				</div>
			{:else if column.key === 'relation'}<details><summary class="cursor-pointer truncate text-xs">{directoryColumns.value(namedGuardian(guardian), 'relation').split('; ')[0]}</summary><p class="text-xs">{directoryColumns.value(namedGuardian(guardian), 'relation')}</p></details>
			{:else if column.key === 'phone'}
				<div class={cn(ctx.selectionMode ? 'col-span-2' : 'col-span-3')}>
					<p class="flex items-center gap-1 text-xs text-muted-foreground">
						<Phone class="h-3 w-3" />
						{guardian.phone}
					</p>
				</div>
			{:else if column.key === 'students'}
				<div class="col-span-2">
					{#if linked.length > 0}
						<div class="flex flex-wrap gap-1">
							{#each linked as student (student.id)}
								<span
									class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-accent-foreground"
								>
									{student.name}
								</span>
							{/each}
						</div>
					{:else}
						<span class="text-xs text-muted-foreground">—</span>
					{/if}
				</div>
			{:else if column.key === 'actions'}
				<div class="col-span-1 flex justify-end">
					<Users class="h-4 w-4 text-muted-foreground" />
				</div>
			{:else}{#if directoryColumns.value(namedGuardian(guardian), column.key).includes('; ')}<details><summary class="cursor-pointer truncate text-sm">{directoryColumns.value(namedGuardian(guardian), column.key).split('; ')[0]}…</summary><p class="whitespace-pre-wrap break-words text-sm">{directoryColumns.value(namedGuardian(guardian), column.key)}</p></details>{:else}<span class="whitespace-pre-wrap break-words text-sm">{directoryColumns.value(namedGuardian(guardian), column.key)}</span>{/if}{/if}
		{/snippet}
	</ListEntityTable>
</div>

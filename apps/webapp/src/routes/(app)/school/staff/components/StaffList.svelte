<script lang="ts">
	import type { ListEntityTableColumn } from '$lib/list/list-entity-table-types';
	import type { StaffMember } from '$lib/types/school';
	import type { StaffSortColumn } from '../lib/staff-list-filters';
	import { page } from '$app/stores';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import ListSelectionBar from '$lib/components/ui/ListSelectionBar.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Mail, Plus } from '$lib/icons';
	import { downloadCsv } from '$lib/list/list-csv-export';
	import { ListSelectionState } from '$lib/list/list-selection-state.svelte';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import {
		cycleStaffListSort,
		staffListUsesFullRoster,

	} from '../lib/staff-list-filters';
	import { getStaffPageState, SCHOOL_STAFF_PAGE_SIZE } from '../staff-page.svelte';
	import StaffCreateModal from './StaffCreateModal.svelte';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (member: StaffMember) => void;
		selectedId?: string;
	} = $props();

	const staffPage = getStaffPageState();
	const classes = $derived(staffPage.classes);
	const selection = new ListSelectionState<StaffMember>();

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	const usesFullRoster = $derived(staffListUsesFullRoster(staffPage.filters.values));

	const filtered = $derived(staffPage.filterVisible(
		usesFullRoster
			? (staffPage.fullRosterStaff.length > 0
				? staffPage.fullRosterStaff
				: staffPage.staff)
			: staffPage.staff,
	));
	const windowed = useInfiniteList(() => filtered, SCHOOL_STAFF_PAGE_SIZE);

	const listTotal = $derived(
		usesFullRoster ? filtered.length : staffPage.totalStaff,
	);
	const listLoading = $derived(
		usesFullRoster ? staffPage.loadingFullRoster : staffPage.listLoading,
	);
	const listLoadingMore = $derived(usesFullRoster ? false : staffPage.listLoadingMore);
	const listHasMore = $derived(
		usesFullRoster ? windowed.hasMore : staffPage.staff.length < staffPage.totalStaff,
	);
	const listVisible = $derived(
		usesFullRoster ? windowed.visible : filtered,
	);
	const listVisibleCount = $derived(listVisible.length);
	const selectionPool = $derived([...staffPage.staff, ...staffPage.fullRosterStaff]);

	const columns = $derived<ListEntityTableColumn[]>([
		{ key: 'name', label: $t('people.name'), span: 5, spanInSelectionMode: 4, sortable: true },
		{ key: 'role', label: $t('people.role'), span: 3, sortable: true },
		{ key: 'classes', label: $t('people.classes'), span: 4, sortable: true },
	]);

	function classNameFor(classId: string) {
		return classes.find(entry => entry.id === classId)?.name ?? classId;
	}

	function loadMoreStaff() {
		if (usesFullRoster) {
			windowed.loadMore();
			return;
		}
		void staffPage.loadMore();
	}

	function cycleSort(column: StaffSortColumn) {
		const next = cycleStaffListSort(staffPage.filters.values, column);
		staffPage.filters.patch(next);
		staffPage.filters.syncNow();
	}

	function exportSelected() {
		const selectedStaff = selection.resolveSelected(selectionPool);
		if (selectedStaff.length === 0) {
			return;
		}
		downloadCsv('staff-selected.csv', [
			['name', 'email', 'role', 'classes'],
			...selectedStaff.map(member => [
				member.name,
				member.email,
				member.role,
				member.classes.map(classId => classNameFor(classId)).join('; '),
			]),
		]);
		toast.success($t('list.exportedCount', { n: selectedStaff.length }));
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('config.staffDirectory')}
		title={$t('people.staffCount', { n: listTotal })}
	>
		{#snippet search()}
			<ListSearchField
				value={staffPage.filters.values.q}
				oninput={event => staffPage.filters.patch({ q: event.currentTarget.value })}
				placeholder={$t('common.search')}
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="STAFF_CREATE"
				mode="disable"
				tooltip={$t('staff.permissionCreate')}
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
						{$t('staff.addStaff')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onEnterSelectMode={selection.selectionMode ? undefined : () => selection.enterSelectionMode()}
			/>
		{/snippet}
	</ListPageHeader>

	<StaffCreateModal bind:open={createOpen.open} />

	{#if selection.selectionMode}
		<ListSelectionBar
			selectedCount={selection.selectedIds.length}
			onExport={exportSelected}
			onClear={() => selection.exitSelectionMode()}
		/>
	{/if}

	<ListEntityTable
		{columns}
		rows={listVisible}
		highlightId={selectedId}
		sort={{ column: staffPage.filters.values.sort, dir: staffPage.filters.values.sortDir }}
		onSort={key => cycleSort(key as StaffSortColumn)}
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
		onLoadMore={loadMoreStaff}
		onRowClick={member => selection.handleRowClick(member, onSelect)}
		rowClass={member => !member.isActive && 'opacity-60'}
	>
		{#snippet row(member, ctx)}
			<div class={cn('flex items-center gap-3', ctx.selectionMode ? 'col-span-4' : 'col-span-5')}>
				<PersonAvatar
					name={member.name}
					initials={member.initials}
					photoUrl={member.photoUrl}
					size="list"
				/>
				<div class="min-w-0">
					<p class="truncate text-sm font-medium">{member.name}</p>
					<p class="flex items-center gap-1 truncate text-xs text-muted-foreground">
						<Mail class="h-3 w-3" />
						{member.email}
					</p>
				</div>
			</div>
			<div class="col-span-3">
				<span
					class="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground/80"
				>
					{$t(`staff.role.${member.role}`)}
				</span>
			</div>
			<div class="col-span-4">
				{#if member.classes.length > 0}
					<div class="flex flex-wrap gap-1">
						{#each member.classes as classId (classId)}
							<span
								class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-accent-foreground"
							>
								{classNameFor(classId)}
							</span>
						{/each}
					</div>
				{:else}
					<span class="text-xs text-muted-foreground">—</span>
				{/if}
			</div>
		{/snippet}
	</ListEntityTable>
</div>

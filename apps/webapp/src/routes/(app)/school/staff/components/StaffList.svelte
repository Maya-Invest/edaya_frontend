<script lang="ts">
	import type { StaffMember } from '$lib/types/school';
	import { page } from '$app/stores';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { ChevronDown, ChevronUp, Mail, Plus } from '$lib/icons';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { SvelteMap } from 'svelte/reactivity';
	import {
		cycleStaffListSort,
		staffListUsesFullRoster,
		type StaffSortColumn,
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

	let selectionMode = $state(false);
	let selectedIds = $state<string[]>([]);
	const selectedSet = $derived(new Set(selectedIds));
	const currentSort = $derived(staffPage.filters.values.sort);
	const currentSortDir = $derived(staffPage.filters.values.sortDir);

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
	const selectedStaff = $derived.by(() => {
		const byId = new SvelteMap<string, StaffMember>();
		for (const member of [...staffPage.staff, ...staffPage.fullRosterStaff]) {
			byId.set(member.id, member);
		}
		return selectedIds
			.map(id => byId.get(id))
			.filter((member): member is StaffMember => Boolean(member));
	});

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

	function sortAriaValue(column: StaffSortColumn): 'ascending' | 'descending' | 'none' {
		if (currentSort !== column) {
			return 'none';
		}
		return currentSortDir === 'asc' ? 'ascending' : 'descending';
	}

	function sortButtonLabel(column: StaffSortColumn, label: string) {
		const direction = sortAriaValue(column);
		if (direction === 'none') {
			return label;
		}
		return `${label}, ${direction === 'ascending' ? $t('list.sortAscending') : $t('list.sortDescending')}`;
	}

	function enterSelectionMode() {
		selectionMode = true;
	}

	function exitSelectionMode() {
		selectionMode = false;
		clearSelection();
	}

	function handleRowClick(member: StaffMember) {
		if (selectionMode) {
			toggleSelected(member.id, !selectedSet.has(member.id));
			return;
		}
		onSelect?.(member);
	}

	function handleRowKeydown(event: KeyboardEvent, member: StaffMember) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleRowClick(member);
		}
	}

	function toggleSelected(staffId: string, checked: boolean) {
		selectedIds = checked
			? [...new Set([...selectedIds, staffId])]
			: selectedIds.filter(id => id !== staffId);
	}

	function clearSelection() {
		selectedIds = [];
	}

	function csvCell(value: string | number | null | undefined) {
		const text = String(value ?? '');
		return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
	}

	function exportSelected() {
		if (selectedStaff.length === 0) {
			return;
		}
		const rows = [
			['name', 'email', 'role', 'classes'],
			...selectedStaff.map((member) => {
				return [
					member.name,
					member.email,
					member.role,
					member.classes.map(classId => classNameFor(classId)).join('; '),
				];
			}),
		];
		const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
		const href = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = href;
		link.download = 'staff-selected.csv';
		link.click();
		URL.revokeObjectURL(href);
		toast.success($t('list.exportedCount', { n: selectedStaff.length }));
	}

	const allVisibleSelected = $derived(
		listVisible.length > 0 && listVisible.every(member => selectedSet.has(member.id)),
	);

	function toggleVisible(checked: boolean) {
		if (!checked) {
			selectedIds = selectedIds.filter(id => !listVisible.some(member => member.id === id));
			return;
		}
		selectedIds = [...new Set([...selectedIds, ...listVisible.map(member => member.id)])];
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
				onEnterSelectMode={selectionMode ? undefined : enterSelectionMode}
			/>
		{/snippet}
	</ListPageHeader>

	<StaffCreateModal bind:open={createOpen.open} />

	{#if selectionMode}
		<div class="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2 shadow-soft">
			<p class="text-sm font-medium">
				{selectedIds.length > 0
					? $t('list.selectedCount', { n: selectedIds.length })
					: $t('list.selectRowsHint')}
			</p>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					class="rounded-full"
					disabled={selectedIds.length === 0}
					onclick={exportSelected}
				>
					{$t('list.export')}
				</Button>
				<Button variant="ghost" size="sm" class="rounded-full" onclick={exitSelectionMode}>
					{$t('common.clear')}
				</Button>
			</div>
		</div>
	{/if}

	<div
		class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
		aria-busy={listLoading}
	>
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			{#if selectionMode}
				<div class="col-span-1 flex items-center">
					<div role="presentation" onclick={event => event.stopPropagation()}>
						<Checkbox
							class="rounded-[2px]"
							checked={allVisibleSelected}
							onCheckedChange={checked => toggleVisible(checked === true)}
							aria-label={$t('list.selectAll')}
						/>
					</div>
				</div>
			{/if}
			<div class={cn('flex items-center', selectionMode ? 'col-span-4' : 'col-span-5')}>
				<button
					type="button"
					class={cn(
						'flex items-center gap-1 transition-colors hover:text-foreground',
						currentSort === 'name' && 'text-foreground',
					)}
					aria-label={sortButtonLabel('name', $t('people.name'))}
					onclick={() => cycleSort('name')}
				>
					{$t('people.name')}
					{#if currentSort === 'name'}
						{#if currentSortDir === 'asc'}
							<ChevronUp class="h-3 w-3" />
						{:else}
							<ChevronDown class="h-3 w-3" />
						{/if}
					{/if}
				</button>
			</div>
			<div class="col-span-3 flex items-center">
				<button
					type="button"
					class={cn(
						'flex items-center gap-1 transition-colors hover:text-foreground',
						currentSort === 'role' && 'text-foreground',
					)}
					aria-label={sortButtonLabel('role', $t('people.role'))}
					onclick={() => cycleSort('role')}
				>
					{$t('people.role')}
					{#if currentSort === 'role'}
						{#if currentSortDir === 'asc'}
							<ChevronUp class="h-3 w-3" />
						{:else}
							<ChevronDown class="h-3 w-3" />
						{/if}
					{/if}
				</button>
			</div>
			<div class="col-span-4 flex items-center">
				<button
					type="button"
					class={cn(
						'flex items-center gap-1 transition-colors hover:text-foreground',
						currentSort === 'classes' && 'text-foreground',
					)}
					aria-label={sortButtonLabel('classes', $t('people.classes'))}
					onclick={() => cycleSort('classes')}
				>
					{$t('people.classes')}
					{#if currentSort === 'classes'}
						{#if currentSortDir === 'asc'}
							<ChevronUp class="h-3 w-3" />
						{:else}
							<ChevronDown class="h-3 w-3" />
						{/if}
					{/if}
				</button>
			</div>
		</div>
		<InfiniteList
			hasMore={listHasMore}
			total={listTotal}
			visibleCount={listVisibleCount}
			loading={listLoading || listLoadingMore}
			onLoadMore={loadMoreStaff}
		>
			<ul class={cn(listLoading && 'opacity-60')}>
				{#each listVisible as member (member.id)}
					{@const active = selectedId === member.id}
					<li>
						<div
							role="button"
							tabindex="0"
							onclick={() => handleRowClick(member)}
							onkeydown={event => handleRowKeydown(event, member)}
							class={cn(
								'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-3.5 text-left transition-colors last:border-b-0',
								active ? 'bg-primary/10' : 'hover:bg-secondary',
								selectionMode && selectedSet.has(member.id) && 'bg-primary/5',
								!member.isActive && 'opacity-60',
							)}
						>
							{#if selectionMode}
								<div class="col-span-1 flex items-center" role="presentation" onclick={event => event.stopPropagation()}>
									<Checkbox
										class="rounded-[2px]"
										checked={selectedSet.has(member.id)}
										onCheckedChange={checked => toggleSelected(member.id, checked === true)}
										aria-label={$t('list.selectRow')}
									/>
								</div>
							{/if}
							<div class={cn('flex items-center gap-3', selectionMode ? 'col-span-4' : 'col-span-5')}>
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
						</div>
					</li>
				{/each}
				{#if listVisible.length === 0 && !listLoading}
					<li class="px-5 py-12 text-center text-sm text-muted-foreground">
						{$t('students.noMatch')}
					</li>
				{/if}
			</ul>
		</InfiniteList>
	</div>
</div>

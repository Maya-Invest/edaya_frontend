<script lang="ts">
	import type { Guardian } from '$lib/types/school';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import InfiniteList from '$lib/components/ui/InfiniteList.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { relationKey } from '$lib/components/school/shared/drawer-constants';
	import { t } from '$lib/i18n';
	import { ChevronDown, ChevronUp, Mail, Phone, Plus, Users } from '$lib/icons';
	import { useInfiniteList } from '$lib/list/use-infinite-list.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { SvelteMap } from 'svelte/reactivity';
	import {
		cycleGuardianListSort,
		guardianListUsesFullRoster,
		type GuardianSortColumn,
	} from '../lib/guardian-list-filters';
	import { getGuardiansPageState, SCHOOL_GUARDIANS_PAGE_SIZE } from '../guardians-page.svelte';
	import GuardianCreateModal from './GuardianCreateModal.svelte';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (guardian: Guardian) => void;
		selectedId?: string;
	} = $props();

	const guardiansPage = getGuardiansPageState();

	let selectionMode = $state(false);
	let selectedIds = $state<string[]>([]);
	const selectedSet = $derived(new Set(selectedIds));
	const currentSort = $derived(guardiansPage.filters.values.sort);
	const currentSortDir = $derived(guardiansPage.filters.values.sortDir);

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	const usesFullRoster = $derived(guardianListUsesFullRoster(guardiansPage.filters.values));

	const filtered = $derived(guardiansPage.filterVisible(
		usesFullRoster
			? (guardiansPage.fullRosterGuardians.length > 0
				? guardiansPage.fullRosterGuardians
				: guardiansPage.guardians)
			: guardiansPage.guardians,
	));
	const windowed = useInfiniteList(() => filtered, SCHOOL_GUARDIANS_PAGE_SIZE);

	const listTotal = $derived(
		usesFullRoster ? filtered.length : guardiansPage.totalGuardians,
	);
	const listLoading = $derived(
		usesFullRoster ? guardiansPage.loadingFullRoster : guardiansPage.listLoading,
	);
	const listLoadingMore = $derived(usesFullRoster ? false : guardiansPage.listLoadingMore);
	const listHasMore = $derived(
		usesFullRoster ? windowed.hasMore : guardiansPage.guardians.length < guardiansPage.totalGuardians,
	);
	const listVisible = $derived(
		usesFullRoster ? windowed.visible : filtered,
	);
	const listVisibleCount = $derived(listVisible.length);
	const selectedGuardians = $derived.by(() => {
		const byId = new SvelteMap<string, Guardian>();
		for (const guardian of [...guardiansPage.guardians, ...guardiansPage.fullRosterGuardians]) {
			byId.set(guardian.id, guardian);
		}
		return selectedIds
			.map(id => byId.get(id))
			.filter((guardian): guardian is Guardian => Boolean(guardian));
	});

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

	function sortAriaValue(column: GuardianSortColumn): 'ascending' | 'descending' | 'none' {
		if (currentSort !== column) {
			return 'none';
		}
		return currentSortDir === 'asc' ? 'ascending' : 'descending';
	}

	function sortButtonLabel(column: GuardianSortColumn, label: string) {
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

	function handleRowClick(guardian: Guardian) {
		if (selectionMode) {
			toggleSelected(guardian.id, !selectedSet.has(guardian.id));
			return;
		}
		onSelect?.(guardian);
	}

	function handleRowKeydown(event: KeyboardEvent, guardian: Guardian) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleRowClick(guardian);
		}
	}

	function toggleSelected(guardianId: string, checked: boolean) {
		selectedIds = checked
			? [...new Set([...selectedIds, guardianId])]
			: selectedIds.filter(id => id !== guardianId);
	}

	function clearSelection() {
		selectedIds = [];
	}

	function csvCell(value: string | number | null | undefined) {
		const text = String(value ?? '');
		return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
	}

	function exportSelected() {
		if (selectedGuardians.length === 0) {
			return;
		}
		const rows = [
			['name', 'email', 'relation', 'phone', 'students'],
			...selectedGuardians.map((guardian) => {
				const linked = guardiansPage.linkedStudents(guardian);
				return [
					guardian.name,
					guardian.email,
					guardian.relation,
					guardian.phone,
					linked.map(student => student.name).join('; '),
				];
			}),
		];
		const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
		const href = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = href;
		link.download = 'guardians-selected.csv';
		link.click();
		URL.revokeObjectURL(href);
		toast.success($t('list.exportedCount', { n: selectedGuardians.length }));
	}

	const allVisibleSelected = $derived(
		listVisible.length > 0 && listVisible.every(guardian => selectedSet.has(guardian.id)),
	);

	function toggleVisible(checked: boolean) {
		if (!checked) {
			selectedIds = selectedIds.filter(id => !listVisible.some(guardian => guardian.id === id));
			return;
		}
		selectedIds = [...new Set([...selectedIds, ...listVisible.map(guardian => guardian.id)])];
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
				permission="PARENT_CREATE"
				mode="disable"
				tooltip={$t('guardian.permissionCreate')}
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
						{$t('guardian.addGuardian')}
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

	<GuardianCreateModal bind:open={createOpen.open} />

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
			<div class="col-span-4 flex items-center">
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
			<div class="col-span-2 flex items-center">
				<button
					type="button"
					class={cn(
						'flex items-center gap-1 transition-colors hover:text-foreground',
						currentSort === 'relation' && 'text-foreground',
					)}
					aria-label={sortButtonLabel('relation', $t('guardian.relationLabel'))}
					onclick={() => cycleSort('relation')}
				>
					{$t('guardian.relationLabel')}
					{#if currentSort === 'relation'}
						{#if currentSortDir === 'asc'}
							<ChevronUp class="h-3 w-3" />
						{:else}
							<ChevronDown class="h-3 w-3" />
						{/if}
					{/if}
				</button>
			</div>
			<div class={cn('flex items-center', selectionMode ? 'col-span-2' : 'col-span-3')}>
				<button
					type="button"
					class={cn(
						'flex w-full items-center gap-1 transition-colors hover:text-foreground',
						currentSort === 'phone' && 'text-foreground',
					)}
					aria-label={sortButtonLabel('phone', $t('common.phone'))}
					onclick={() => cycleSort('phone')}
				>
					{$t('common.phone')}
					{#if currentSort === 'phone'}
						{#if currentSortDir === 'asc'}
							<ChevronUp class="h-3 w-3" />
						{:else}
							<ChevronDown class="h-3 w-3" />
						{/if}
					{/if}
				</button>
			</div>
			<div class="col-span-2 flex items-center">
				<button
					type="button"
					class={cn(
						'flex items-center gap-1 transition-colors hover:text-foreground',
						currentSort === 'students' && 'text-foreground',
					)}
					aria-label={sortButtonLabel('students', $t('students.student'))}
					onclick={() => cycleSort('students')}
				>
					{$t('students.student')}
					{#if currentSort === 'students'}
						{#if currentSortDir === 'asc'}
							<ChevronUp class="h-3 w-3" />
						{:else}
							<ChevronDown class="h-3 w-3" />
						{/if}
					{/if}
				</button>
			</div>
			<div class="col-span-1 text-right">·</div>
		</div>
		<InfiniteList
			hasMore={listHasMore}
			total={listTotal}
			visibleCount={listVisibleCount}
			loading={listLoading || listLoadingMore}
			onLoadMore={loadMoreGuardians}
		>
			<ul class={cn(listLoading && 'opacity-60')}>
				{#each listVisible as guardian (guardian.id)}
					{@const active = selectedId === guardian.id}
					{@const linked = guardiansPage.linkedStudents(guardian)}
					<li>
						<div
							role="button"
							tabindex="0"
							onclick={() => handleRowClick(guardian)}
							onkeydown={event => handleRowKeydown(event, guardian)}
							class={cn(
								'grid w-full grid-cols-12 items-center gap-4 border-b border-border px-5 py-3.5 text-left transition-colors last:border-b-0',
								active ? 'bg-primary/10' : 'hover:bg-secondary',
								selectionMode && selectedSet.has(guardian.id) && 'bg-primary/5',
							)}
						>
							{#if selectionMode}
								<div class="col-span-1 flex items-center" role="presentation" onclick={event => event.stopPropagation()}>
									<Checkbox
										class="rounded-[2px]"
										checked={selectedSet.has(guardian.id)}
										onCheckedChange={checked => toggleSelected(guardian.id, checked === true)}
										aria-label={$t('list.selectRow')}
									/>
								</div>
							{/if}
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
							<div class="col-span-2">
								<span
									class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
								>
									{$t(relationKey[guardian.relation])}
								</span>
							</div>
							<div class={cn(selectionMode ? 'col-span-2' : 'col-span-3')}>
								<p class="flex items-center gap-1 text-xs text-muted-foreground">
									<Phone class="h-3 w-3" />
									{guardian.phone}
								</p>
							</div>
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
							<div class="col-span-1 flex justify-end">
								<Users class="h-4 w-4 text-muted-foreground" />
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

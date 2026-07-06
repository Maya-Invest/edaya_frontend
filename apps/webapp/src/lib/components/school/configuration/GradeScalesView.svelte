<script lang="ts">
	import type { GradeScale } from '$lib/types/report-cards';
	import { page } from '$app/stores';
	import { deleteGradeScaleMutation } from '$lib/api/mutations/delete-entity.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { Pencil, Plus, Trash2 } from '$lib/icons';
	import { readGradeScaleListFilters, writeGradeScaleListFilters } from '$lib/list/list-url-filters';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { reportCardsContext } from '$lib/report-cards/context.svelte';
	import { get } from 'svelte/store';
	import GradeScaleFormModal from './GradeScaleFormModal.svelte';

	const initialFilters = $derived(readGradeScaleListFilters($page.url));

	const listFilters = new ListFiltersState<{ q: string }>(
		{
			getUrl: () => $page.url,
			write: writeGradeScaleListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readGradeScaleListFilters($page.url),
	);

	const modals = createUrlSyncedModals({ allowed: ['create', 'edit'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');
	const editOpen = bindUrlModal(modals, 'edit');

	let editingScale = $state<GradeScale | null>(null);
	let deleteOpen = $state(false);
	let deleteBusy = $state(false);
	let deleteTargetId = $state<string | null>(null);
	let deleteTargetName = $state('');

	const filteredScales = $derived(
		reportCardsContext.scales.filter((scale) => {
			const needle = listFilters.values.q.trim().toLowerCase();
			if (!needle) {
				return true;
			}
			return scale.name.toLowerCase().includes(needle)
				|| (scale.description?.toLowerCase().includes(needle) ?? false);
		}),
	);

	$effect(() => {
		listFilters.hydrate(initialFilters);
	});

	$effect(() => {
		if (!listFilters.ready) {
			return;
		}
		void listFilters.values.q;
		listFilters.scheduleSync();
	});

	function openEdit(scale: GradeScale) {
		editingScale = scale;
		editOpen.open = true;
	}

	function openDelete(scaleId: string, scaleName: string) {
		deleteTargetId = scaleId;
		deleteTargetName = scaleName;
		deleteOpen = true;
	}

	async function confirmDelete() {
		if (!deleteTargetId) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await deleteGradeScaleMutation(deleteTargetId, {
				navigate: false,
				successMessage: get(t)('gradeScales.toastDeleted', { name: deleteTargetName }),
			});
			if (ok) {
				deleteOpen = false;
				deleteTargetId = null;
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<div class="animate-fade-in space-y-6">
	<ListPageHeader
		eyebrow={$t('gradeScales.subtitle')}
		title={$t('gradeScales.title', { n: filteredScales.length })}
	>
		{#snippet search()}
			<ListSearchField bind:value={listFilters.values.q} oninput={() => listFilters.scheduleSync()} />
		{/snippet}
		{#snippet primary()}
			<PermissionGate permission="REPORT_CARD_CONFIGURE">
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (createOpen.open = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('gradeScales.add')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			<div class="col-span-4">{$t('gradeScales.name')}</div>
			<div class="col-span-3">{$t('gradeScales.range')}</div>
			<div class="col-span-2">{$t('gradeScales.passing')}</div>
			<div class="col-span-2">{$t('gradeScales.default')}</div>
			<div class="col-span-1"></div>
		</div>
		<ul>
			{#if filteredScales.length === 0}
				<li class="px-5 py-12 text-center text-sm text-muted-foreground">
					{$t('dataState.emptyDescription')}
				</li>
			{:else}
				{#each filteredScales as scale (scale.id)}
					<li class="grid grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
						<div class="col-span-4 min-w-0">
							<p class="truncate text-sm font-medium">{scale.name}</p>
							{#if scale.description}
								<p class="truncate text-xs text-muted-foreground">{scale.description}</p>
							{/if}
						</div>
						<div class="col-span-3 font-mono text-sm text-muted-foreground">
							{scale.minScore} → {scale.maxScore}
						</div>
						<div class="col-span-2 text-sm tabular-nums">{scale.passingScore}</div>
						<div class="col-span-2">
							{#if scale.isDefault}
								<span class="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] uppercase">
									{$t('gradeScales.default')}
								</span>
							{:else}
								<span class="text-xs text-muted-foreground">—</span>
							{/if}
						</div>
						<div class="col-span-1 flex justify-end">
							{#if !scale.isDefault}
								<PermissionGate permission="REPORT_CARD_CONFIGURE">
									{#snippet children({ disabled, title })}
										<RowActionMenu>
											{#snippet children()}
												<RowActionMenuItem
													{disabled}
													{title}
													onclick={() => openEdit(scale)}
												>
													<Pencil class="h-4 w-4" />
													{$t('common.edit')}
												</RowActionMenuItem>
												<RowActionMenuItem
													destructive
													{disabled}
													{title}
													onclick={() => openDelete(scale.id, scale.name)}
												>
													<Trash2 class="h-4 w-4" />
													{$t('common.delete')}
												</RowActionMenuItem>
											{/snippet}
										</RowActionMenu>
									{/snippet}
								</PermissionGate>
							{/if}
						</div>
					</li>
				{/each}
			{/if}
		</ul>
	</div>
</div>

<GradeScaleFormModal bind:open={createOpen.open} />
<GradeScaleFormModal bind:open={editOpen.open} scale={editingScale} />

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('gradeScales.deleteConfirm', { name: deleteTargetName })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>

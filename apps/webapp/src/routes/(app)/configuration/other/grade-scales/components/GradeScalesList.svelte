<script lang="ts">
	import type { GradeScale } from '$lib/types/report-cards';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { Pencil, Plus, Trash2 } from '$lib/icons';
	import { exportMatchingList } from '$lib/list/list-csv-export';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import { getGradeScalesPageState } from '../grade-scales-page.svelte';
	import GradeScaleFormModal from './GradeScaleFormModal.svelte';

	const gradeScalesPage = getGradeScalesPageState();

	const modals = createUrlSyncedModals({
		allowed: ['create', 'edit', 'delete'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');
	const editOpen = bindUrlModal(modals, 'edit');
	const deleteOpen = bindUrlModal(modals, 'delete');

	let deleteBusy = $state(false);

	const targetScale = $derived.by((): GradeScale | null => {
		if (!modals.target) {
			return null;
		}
		return gradeScalesPage.scaleFor(modals.target) ?? null;
	});
	const editingScale = $derived(modals.active === 'edit' ? targetScale : null);
	const deleteTarget = $derived(modals.active === 'delete' && !targetScale?.isDefault ? targetScale : null);

	const filteredScales = $derived(
		gradeScalesPage.scales.filter((scale) => {
			const needle = gradeScalesPage.filters.values.q.trim().toLowerCase();
			if (!needle) {
				return true;
			}
			return scale.name.toLowerCase().includes(needle)
				|| (scale.description?.toLowerCase().includes(needle) ?? false);
		}),
	);

	$effect(() => {
		if (!gradeScalesPage.filters.ready) {
			return;
		}
		void gradeScalesPage.filters.values.q;
		gradeScalesPage.filters.scheduleSync();
	});

	$effect(() => {
		if (!modals.ready) {
			return;
		}
		if (modals.active === 'create') {
			if (modals.target !== null) {
				modals.open('create');
			}
			return;
		}
		if (
			(modals.active === 'edit' && !editingScale)
			|| (modals.active === 'delete' && !deleteTarget)
		) {
			modals.close();
		}
	});

	function openEdit(scale: GradeScale) {
		modals.open('edit', { target: scale.id });
	}

	function openDelete(scale: GradeScale) {
		modals.open('delete', { target: scale.id });
	}

	async function confirmDelete() {
		const target = deleteTarget;
		if (!target) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await gradeScalesPage.deleteScale({
				scaleId: target.id,
				successMessage: get(t)('gradeScales.toastDeleted', { name: target.name }),
			});
			if (ok) {
				deleteOpen.open = false;
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
			<ListSearchField
				bind:value={gradeScalesPage.filters.values.q}
				oninput={() => gradeScalesPage.filters.scheduleSync()}
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate permission="REPORT_CARD_CONFIGURE">
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => modals.open('create')}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('gradeScales.add')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu
				exportOnly
				onExport={() => void exportMatchingList({
					filename: 'grade-scales.csv',
					headers: ['name', 'minScore', 'maxScore', 'passingScore', 'default'],
					loadAll: async () => filteredScales.map(scale => [
						scale.name,
						scale.minScore,
						scale.maxScore,
						scale.passingScore,
						scale.isDefault ? 'default' : '',
					]),
				})}
			/>
		{/snippet}
	</ListPageHeader>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
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
						<div class="col-span-3 font-sans tabular-nums text-sm text-muted-foreground">
							{scale.minScore} → {scale.maxScore}
						</div>
						<div class="col-span-2 text-sm tabular-nums">{scale.passingScore}</div>
						<div class="col-span-2">
							{#if scale.isDefault}
								<span class="rounded-full bg-accent/15 px-2 py-0.5 font-sans tabular-nums text-xs uppercase">
									{$t('gradeScales.default')}
								</span>
							{:else}
								<span class="text-xs text-muted-foreground">—</span>
							{/if}
						</div>
						<div class="col-span-1 flex justify-end">
							<PermissionGate permission="REPORT_CARD_CONFIGURE">
								{#snippet children({ disabled, title })}
									<RowActionMenu>
										<RowActionMenuItem {disabled} {title} onclick={() => openEdit(scale)}>
											<Pencil class="h-4 w-4" />
											{$t('common.edit')}
										</RowActionMenuItem>
										{#if !scale.isDefault}
											<RowActionMenuItem
												destructive
												{disabled}
												{title}
												onclick={() => openDelete(scale)}
											>
												<Trash2 class="h-4 w-4" />
												{$t('common.delete')}
											</RowActionMenuItem>
										{/if}
									</RowActionMenu>
								{/snippet}
							</PermissionGate>
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
	bind:open={deleteOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('gradeScales.deleteConfirm', { name: deleteTarget?.name ?? '' })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>

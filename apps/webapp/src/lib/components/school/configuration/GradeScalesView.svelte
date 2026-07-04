<script lang="ts">
	import { page } from '$app/stores';
	import { deleteGradeScaleMutation } from '$lib/api/mutations/delete-entity.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { t } from '$lib/i18n';
	import { Plus, Trash2 } from '$lib/icons';
	import { readGradeScaleListFilters, writeGradeScaleListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { reportCardsContext } from '$lib/report-cards/context.svelte';
	import { get } from 'svelte/store';
	import GradeScaleFormModal from './GradeScaleFormModal.svelte';

	const initialFilters = $derived(readGradeScaleListFilters($page.url));

	let q = $state('');
	let filtersReady = $state(false);
	let createOpen = $state(false);
	let deleteOpen = $state(false);
	let deleteBusy = $state(false);
	let deleteTargetId = $state<string | null>(null);
	let deleteTargetName = $state('');

	const filteredScales = $derived(
		reportCardsContext.scales.filter((scale) => {
			const needle = q.trim().toLowerCase();
			if (!needle)
				return true;
			return scale.name.toLowerCase().includes(needle)
				|| (scale.description?.toLowerCase().includes(needle) ?? false);
		}),
	);

	function syncFiltersToUrl() {
		const href = writeGradeScaleListFilters($page.url, { q });
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		const next = initialFilters;
		q = next.q;
		filtersReady = true;
	});

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	function scheduleFilterSync() {
		if (!filtersReady)
			return;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(syncFiltersToUrl, 250);
	}

	function openDelete(scaleId: string, scaleName: string) {
		deleteTargetId = scaleId;
		deleteTargetName = scaleName;
		deleteOpen = true;
	}

	async function confirmDelete() {
		if (!deleteTargetId)
			return;
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

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('gradeScales.subtitle')}
		title={$t('gradeScales.title', { n: filteredScales.length })}
	>
		{#snippet search()}
			<ListSearchField bind:value={q} oninput={scheduleFilterSync} />
		{/snippet}
		{#snippet primary()}
			<PermissionGate permission="REPORT_CARD_CONFIGURE">
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => (createOpen = true)}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('gradeScales.add')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</ListPageHeader>

	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#if filteredScales.length === 0}
			<p class="col-span-full py-12 text-center text-sm text-muted-foreground">
				{$t('dataState.emptyDescription')}
			</p>
		{:else}
			{#each filteredScales as scale (scale.id)}
				<article class="rounded-2xl border border-border bg-card p-5 shadow-soft">
					<div class="mb-2 flex items-start justify-between gap-2">
						<h3 class="font-display font-semibold">{scale.name}</h3>
						<div class="flex items-center gap-2">
							{#if scale.isDefault}
								<span class="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] uppercase">
									{$t('gradeScales.default')}
								</span>
							{:else}
								<PermissionGate permission="REPORT_CARD_CONFIGURE">
									{#snippet children({ disabled, title })}
										<RowActionMenu>
											{#snippet children()}
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
					</div>
					<p class="font-mono text-sm text-muted-foreground">
						{scale.minScore} → {scale.maxScore} · {$t('gradeScales.passing')} {scale.passingScore}
					</p>
					{#if scale.description}
						<p class="mt-2 text-sm text-muted-foreground">{scale.description}</p>
					{/if}
				</article>
			{/each}
		{/if}
	</div>
</div>

<GradeScaleFormModal bind:open={createOpen} />

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('gradeScales.deleteConfirm', { name: deleteTargetName })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>

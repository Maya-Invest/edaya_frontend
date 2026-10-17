<script lang="ts">
	import type { SubjectCategoryOption } from '$lib/api/subject-categories-data';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenu from '$lib/components/ui/RowActionMenu.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { lang, t } from '$lib/i18n';
	import { catalogCategory } from '$lib/i18n/catalog-label';
	import { Pencil, Plus, Trash2 } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import { getSubjectCategoriesPageState } from '../subject-categories-page.svelte';
	import SubjectCategoryFormModal from './SubjectCategoryFormModal.svelte';

	const subjectCategoriesPage = getSubjectCategoriesPageState();
	const modals = createUrlSyncedModals({
		allowed: ['create', 'edit', 'delete'],
		getUrl: () => $page.url,
	});
	const createOpen = bindUrlModal(modals, 'create');
	const editOpen = bindUrlModal(modals, 'edit');
	const deleteOpen = bindUrlModal(modals, 'delete');
	let deleteBusy = $state(false);

	const filteredCategories = $derived(
		subjectCategoriesPage.categories.filter((category) => {
			const needle = subjectCategoriesPage.filters.values.q.trim().toLowerCase();
			if (!needle) {
				return true;
			}
			const label = catalogCategory(category.name, $lang).toLowerCase();
			return category.name.toLowerCase().includes(needle) || label.includes(needle);
		}),
	);
	const targetCategory = $derived.by((): SubjectCategoryOption | null => {
		if (!modals.target) {
			return null;
		}
		return subjectCategoriesPage.categories.find(category => category.id === modals.target) ?? null;
	});
	const editingCategory = $derived(modals.active === 'edit' ? targetCategory : null);
	const deleteTarget = $derived(modals.active === 'delete' ? targetCategory : null);

	$effect(() => {
		modals.hydrate();
	});

	async function confirmDelete() {
		if (!deleteTarget || deleteBusy) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await subjectCategoriesPage.deleteCategory({
				categoryId: deleteTarget.id,
				successMessage: get(t)('subjectCategories.toastDeleted', { name: deleteTarget.name }),
			});
			if (ok) {
				modals.close();
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('config.subjectCategories')}
		title={$t('subjectCategories.title', { n: String(filteredCategories.length) })}
	>
		{#snippet search()}
			<ListSearchField
				bind:value={subjectCategoriesPage.filters.values.q}
				oninput={() => subjectCategoriesPage.filters.scheduleSync()}
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate permission="ACADEMIC_PROGRAM_UPDATE">
				{#snippet children({ disabled, title })}
					<Button size="sm" class="rounded-full" {disabled} {title} onclick={() => modals.open('create')}>
						<Plus class="mr-1 h-4 w-4" />
						{$t('subjectCategories.add')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</ListPageHeader>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<table class="w-full text-sm">
			<thead class="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
				<tr>
					<th class="px-4 py-3 font-medium">{$t('subjectCategories.name')}</th>
					<th class="w-12 px-4 py-3"></th>
				</tr>
			</thead>
			<tbody>
				{#each filteredCategories as category (category.id)}
					<tr class="border-b border-border/70 last:border-0">
						<td class="px-4 py-3">{catalogCategory(category.name, $lang)}</td>
						<td class="px-4 py-3 text-right">
							<PermissionGate permission="ACADEMIC_PROGRAM_UPDATE">
								{#snippet children({ disabled, title })}
									<RowActionMenu>
										<RowActionMenuItem {disabled} {title} onclick={() => modals.open('edit', { target: category.id })}>
											<Pencil class="h-4 w-4" />
											{$t('common.edit')}
										</RowActionMenuItem>
										<RowActionMenuItem
											destructive
											{disabled}
											{title}
											onclick={() => modals.open('delete', { target: category.id })}
										>
											<Trash2 class="h-4 w-4" />
											{$t('common.delete')}
										</RowActionMenuItem>
									</RowActionMenu>
								{/snippet}
							</PermissionGate>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="2" class="px-4 py-8 text-center text-muted-foreground">
							{$t('subjectCategories.subtitle')}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if createOpen.open}
	<SubjectCategoryFormModal bind:open={createOpen.open} />
{/if}

{#if editOpen.open && editingCategory}
	<SubjectCategoryFormModal bind:open={editOpen.open} category={editingCategory} />
{/if}

{#if deleteOpen.open && deleteTarget}
	<ConfirmModal
		bind:open={deleteOpen.open}
		title={$t('common.deleteConfirmTitle')}
		description={$t('subjectCategories.deleteConfirm', { name: deleteTarget.name })}
		confirmLabel={$t('common.delete')}
		cancelLabel={$t('common.cancel')}
		busy={deleteBusy}
		onConfirm={confirmDelete}
	/>
{/if}

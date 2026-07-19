<script lang="ts">
	import type {
		CatalogSubjectDrawerContext,
		CatalogSubjectMatterRow,
	} from '$lib/api/mutations/catalog-subject.mutations';
	import {
		deleteCatalogSubjectMutation,
		loadCatalogSubjectDrawerData,
	} from '$lib/api/mutations/catalog-subject.mutations';
	import { deleteSubjectMatterMutation } from '$lib/api/mutations/subject-matter.mutations';
	import type { Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import CatalogSubjectFormModal from '$lib/components/school/configuration/CatalogSubjectFormModal.svelte';
	import CatalogSubjectMatterFormModal from '$lib/components/school/configuration/CatalogSubjectMatterFormModal.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { buildSubjectChapterSummary } from '$lib/subjects/chapter-summary';
	import { get } from 'svelte/store';

	const { subject }: { subject: Subject } = $props();

	type CatalogSubjectModal = 'edit' | 'add-chapter' | 'edit-chapter';

	const modals = createUrlSyncedModals<CatalogSubjectModal>({
		allowed: ['edit', 'add-chapter', 'edit-chapter'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editOpen = bindUrlModal(modals, 'edit');
	const addChapterOpen = bindUrlModal(modals, 'add-chapter');
	const editChapterOpen = bindUrlModal(modals, 'edit-chapter');

	let deleteOpen = $state(false);
	let deleteBusy = $state(false);
	let matterRows = $state<CatalogSubjectMatterRow[]>([]);
	let matterContext = $state<CatalogSubjectDrawerContext | null>(null);
	let editingMatter = $state<CatalogSubjectMatterRow | null>(null);

	const live = $derived(
		detailDataContext.catalogSubjects.find(entry => entry.id === subject.id) ?? subject,
	);
	const isInCatalog = $derived(
		detailDataContext.catalogSubjects.some(entry => entry.id === subject.id),
	);
	const gradeLevel = $derived(
		academicContext.gradeLevelById(live.gradeLevelId ?? live.classId),
	);
	const headerSummary = $derived(
		matterRows.length > 0
			? buildSubjectChapterSummary(matterRows.map(row => row.name))
			: live.description,
	);

	async function refreshMatters() {
		if (!isInCatalog) {
			return;
		}
		const loaded = await loadCatalogSubjectDrawerData(subject.id);
		if (!loaded) {
			return;
		}
		matterContext = loaded.context;
		matterRows = loaded.matters;
	}

	$effect(() => {
		if (!isInCatalog) {
			return;
		}
		void subject.id;
		void refreshMatters();
	});

	function openEditChapter(row: CatalogSubjectMatterRow) {
		editingMatter = row;
		modals.open('edit-chapter');
	}

	function handleMatterSaved(row: CatalogSubjectMatterRow) {
		const index = matterRows.findIndex(entry => entry.id === row.id);
		if (index >= 0) {
			matterRows = matterRows.map(entry => (entry.id === row.id ? row : entry));
			return;
		}
		matterRows = [...matterRows, row].sort((left, right) => left.sequenceOrder - right.sequenceOrder);
	}

	async function removeChapter(row: CatalogSubjectMatterRow): Promise<boolean> {
		const ok = await deleteSubjectMatterMutation(
			row.id,
			get(t)('subjects.chapters.deleteSuccess', { name: row.name }),
		);
		if (ok) {
			matterRows = matterRows.filter(entry => entry.id !== row.id);
		}
		return ok;
	}

	async function confirmDelete() {
		deleteBusy = true;
		try {
			const ok = await deleteCatalogSubjectMutation(live.id, {
				successMessage: get(t)('subjects.catalogToastDeleted', { name: live.name }),
			});
			if (ok) {
				deleteOpen = false;
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<div class="space-y-5">
	<DrawerEntityHeader name={live.name} summary={headerSummary}>
		{#snippet chips()}
			<span class="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/80">
				{live.category}
			</span>
			<span class="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] tabular-nums text-foreground/80">
				{$t('subjects.hoursPerWeek', { h: live.hoursPerWeek })}
			</span>
		{/snippet}
		{#snippet actions()}
			<PermissionGate permission="SCHOOL_STRUCTURE_CONFIGURE" mode="disable">
				{#snippet children({ disabled, title })}
					<button
						type="button"
						class="inline-flex h-9 items-center rounded-full border border-input bg-background px-4 text-sm font-medium transition hover:bg-secondary disabled:opacity-50"
						{disabled}
						{title}
						onclick={() => (editOpen.open = true)}
					>
						{$t('common.edit')}
					</button>
					<button
						type="button"
						class="inline-flex h-9 items-center rounded-full border border-destructive/30 bg-background px-4 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
						{disabled}
						{title}
						onclick={() => (deleteOpen = true)}
					>
						{$t('common.delete')}
					</button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</DrawerEntityHeader>

	<div class="grid grid-cols-2 gap-3">
		<DrawerField label={$t('subjects.name')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{live.name}</div>
		</DrawerField>
		<DrawerField label={$t('subjects.category')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{live.category}</div>
		</DrawerField>
		<DrawerField label={$t('classGroups.gradeLevel')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{gradeLevel?.name ?? '—'}
			</div>
		</DrawerField>
		<DrawerField label={$t('subjects.hours')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
				{live.hoursPerWeek}h
			</div>
		</DrawerField>
	</div>

	<section class="space-y-2">
		<div class="flex items-center justify-between gap-3">
			<p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('subjects.chapters.configured')}
			</p>
			<PermissionGate permission="SCHOOL_STRUCTURE_CONFIGURE" mode="disable">
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => modals.open('add-chapter')}
					>
						<Plus class="mr-1 h-3.5 w-3.5" />
						{$t('subjects.chapters.add')}
					</Button>
				{/snippet}
			</PermissionGate>
		</div>
		{#each matterRows as row (row.id)}
			<div class="rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="text-sm font-semibold">{row.name}</p>
						{#if row.description}
							<p class="mt-1 text-xs text-muted-foreground">{row.description}</p>
						{/if}
					</div>
					<PermissionGate permission="SCHOOL_STRUCTURE_CONFIGURE" mode="disable">
						{#snippet children({ disabled, title })}
							<div class="flex shrink-0 items-center gap-1">
								<Button
									variant="ghost"
									size="sm"
									class="h-8 rounded-full"
									{disabled}
									{title}
									onclick={() => openEditChapter(row)}
								>
									{$t('common.edit')}
								</Button>
								<DeleteEntityButton
									{disabled}
									{title}
									confirmTitle={$t('common.deleteConfirmTitle')}
									confirmDescription={$t('subjects.chapters.deleteConfirm', { name: row.name })}
									onConfirm={() => removeChapter(row)}
								/>
							</div>
						{/snippet}
					</PermissionGate>
				</div>
			</div>
		{:else}
			<p class="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
				{$t('subjects.chapters.emptyCatalog')}
			</p>
		{/each}
	</section>
</div>

<CatalogSubjectFormModal bind:open={editOpen.open} subject={live} />

{#if matterContext}
	<CatalogSubjectMatterFormModal
		bind:open={addChapterOpen.open}
		context={matterContext}
		defaultSequenceOrder={matterRows.length + 1}
		onSaved={handleMatterSaved}
	/>
	<CatalogSubjectMatterFormModal
		bind:open={editChapterOpen.open}
		matter={editingMatter}
		context={matterContext}
		onSaved={handleMatterSaved}
	/>
{/if}

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('subjects.catalogDeleteConfirm', { name: live.name })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDelete}
/>

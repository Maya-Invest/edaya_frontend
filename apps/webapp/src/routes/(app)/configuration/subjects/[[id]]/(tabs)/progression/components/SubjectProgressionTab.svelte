<script lang="ts">
	import type { SubjectMatterDrawerRow } from '$lib/api/mutations/subject-matter.mutations';
	import type { Subject } from '$lib/types/school';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { deleteSubjectMatterMutation } from '$lib/api/mutations/subject-matter.mutations';
	import ClassSubjectTimetableSection from '$lib/components/school/academics/ClassSubjectTimetableSection.svelte';
	import SubjectMatterFormModal from '$lib/components/school/academics/SubjectMatterFormModal.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { t } from '$lib/i18n';
	import { Plus, Trash2 } from '$lib/icons';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { get } from 'svelte/store';
	import { chapterProgressFromEntries } from '../../../../lib/subjects-helpers';
	import { getSubjectsPageState } from '../../../../subjects-page.svelte';
	import { getSubjectProgressionTabState } from '../subject-progression-tab.svelte';

	type SubjectDrawerModal = 'add-chapter' | 'edit-chapter' | 'delete-chapter';

	const { subject }: { subject: Subject } = $props();

	const subjectsPage = getSubjectsPageState();
	const progressionTab = getSubjectProgressionTabState();
	const matterRows = $derived(progressionTab.rowsFor(subject.id));
	const matterContext = $derived(progressionTab.matterContextFor(subject.id));
	const isCatalogSubject = $derived(Boolean(subject.gradeLevelId));
	const entries = $derived(isCatalogSubject ? [] : subjectsPage.logEntriesForSubject(subject));
	const chaptersData = $derived(chapterProgressFromEntries(entries));

	const modals = createUrlSyncedModals<SubjectDrawerModal>({
		allowed: ['add-chapter', 'edit-chapter', 'delete-chapter'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	afterNavigate(() => {
		modals.hydrate();
		validateModalTarget();
	});
	const addChapterOpen = bindUrlModal(modals, 'add-chapter');
	const editChapterOpen = bindUrlModal(modals, 'edit-chapter');
	const deleteChapterOpen = bindUrlModal(modals, 'delete-chapter');

	let deleteBusy = $state(false);

	const editingMatter = $derived(
		modals.isOpen('edit-chapter') && modals.target
			? matterRows.find(row => row.id === modals.target) ?? null
			: null,
	);
	const deletingMatter = $derived(
		modals.isOpen('delete-chapter') && modals.target
			? matterRows.find(row => row.id === modals.target) ?? null
			: null,
	);

	function validateModalTarget() {
		if (!modals.ready || progressionTab.slice?.subjectKey !== subject.id || !modals.active) {
			return;
		}
		if (modals.active === 'add-chapter') {
			if (modals.target !== null) {
				modals.open('add-chapter');
			}
			return;
		}
		if (
			(modals.active === 'edit-chapter' && !editingMatter)
			|| (modals.active === 'delete-chapter' && !deletingMatter)
		) {
			modals.close();
		}
	}

	function handleMatterSaved(row: SubjectMatterDrawerRow) {
		progressionTab.upsertRow(row);
	}

	async function removeChapter(row: SubjectMatterDrawerRow): Promise<boolean> {
		const ok = await deleteSubjectMatterMutation(
			row.id,
			get(t)('subjects.chapters.deleteSuccess', { name: row.name }),
		);
		if (ok) {
			progressionTab.removeRow(row.id);
		}
		return ok;
	}

	async function confirmDeleteChapter() {
		if (!deletingMatter || deleteBusy) {
			return;
		}
		deleteBusy = true;
		try {
			const ok = await removeChapter(deletingMatter);
			if (ok) {
				modals.close();
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

{#if !isCatalogSubject}
	<ClassSubjectTimetableSection classSubjectId={subject.id} school={academicContext.schools[0]} />
{/if}

<div class="space-y-4">
	<section class="space-y-2">
		<div class="flex items-center justify-between gap-3">
			<p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('subjects.chapters.configured')}
			</p>
			<Button size="sm" class="rounded-full" onclick={() => modals.open('add-chapter')}>
				<Plus class="mr-1 h-3.5 w-3.5" />
				{$t('subjects.chapters.add')}
			</Button>
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
					<div class="flex shrink-0 items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							class="h-8 rounded-full"
							onclick={() => modals.open('edit-chapter', { target: row.id })}
						>
							{$t('common.edit')}
						</Button>
						<Button
							variant="outline"
							size="sm"
							class="rounded-full text-destructive hover:text-destructive"
							onclick={() => modals.open('delete-chapter', { target: row.id })}
						>
							<Trash2 class="mr-1 h-3.5 w-3.5" />
							{$t('common.delete')}
						</Button>
					</div>
				</div>
			</div>
		{:else}
			<p class="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
				{$t('subjects.chapters.empty')}
			</p>
		{/each}
	</section>

	{#if !isCatalogSubject}
		<div class="space-y-4">
			<div class="rounded-2xl border border-border bg-secondary/40 p-4">
				<div class="flex items-center justify-between">
					<p class="text-[10px] uppercase tracking-wider text-muted-foreground">
						{$t('teaching.overallProgress')}
					</p>
					<span class="font-mono text-xs">{chaptersData.overall}%</span>
				</div>
				<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
					<div class="h-full bg-primary" style="width: {chaptersData.overall}%"></div>
				</div>
			</div>

			<div class="space-y-2">
				{#each chaptersData.chapters as [chapter, progress] (chapter)}
					<div class="rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
						<div class="flex items-center justify-between gap-3">
							<p class="text-sm font-semibold">{chapter}</p>
							<span class="font-mono text-xs text-muted-foreground">{progress}%</span>
						</div>
						<div class="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
							<div class="h-full bg-primary" style="width: {progress}%"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

{#if matterContext}
	<SubjectMatterFormModal
		bind:open={addChapterOpen.open}
		subjectId={matterContext.catalogSubjectId}
		classSubjectId={matterContext.classSubjectId}
		classGroupId={matterContext.classGroupId}
		gradeLevelSubjectId={matterContext.gradeLevelSubjectId}
		defaultSequenceOrder={matterRows.length + 1}
		onSaved={handleMatterSaved}
	/>
	<SubjectMatterFormModal
		bind:open={editChapterOpen.open}
		matter={editingMatter}
		subjectId={matterContext.catalogSubjectId}
		classSubjectId={matterContext.classSubjectId}
		classGroupId={matterContext.classGroupId}
		gradeLevelSubjectId={matterContext.gradeLevelSubjectId}
		onSaved={handleMatterSaved}
	/>
{/if}

<ConfirmModal
	bind:open={deleteChapterOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={deletingMatter
		? $t('subjects.chapters.deleteConfirm', { name: deletingMatter.name })
		: undefined}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDeleteChapter}
/>

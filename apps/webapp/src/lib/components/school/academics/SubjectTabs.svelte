<script lang="ts">
	import type { SubjectMatterDrawerRow } from '$lib/api/mutations/subject-matter.mutations';
	import type { Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import { deleteClassSubjectMutation } from '$lib/api/mutations/delete-entity.mutations';
	import {
		deleteSubjectMatterMutation,
		loadSubjectMatterDrawerRows,
	} from '$lib/api/mutations/subject-matter.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import DrawerTabBar from '$lib/components/ui/DrawerTabBar.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { createUrlSyncedDrawerTabs } from '$lib/drawer/drawer-tabs-state.svelte';
	import { t } from '$lib/i18n';
	import { Check, FileText, Paperclip, Plus } from '$lib/icons';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { teachingLogContext } from '$lib/teaching-log/context.svelte';
	import { get } from 'svelte/store';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import SubjectFormModal from './SubjectFormModal.svelte';
	import SubjectMatterFormModal from './SubjectMatterFormModal.svelte';
	import { buildSubjectChapterSummary } from '$lib/subjects/chapter-summary';

	const { s }: { s: Subject } = $props();

	let deleteOpen = $state(false);
	let deleteBusy = $state(false);

	type SubjectDrawerModal = 'edit-subject' | 'add-chapter' | 'edit-chapter';

	type SubjectTab = 'progression' | 'logbook';

	const tabs = createUrlSyncedDrawerTabs<SubjectTab>({
		allowed: ['progression', 'logbook'],
		defaultTab: 'progression',
		getUrl: () => $page.url,
	});

	$effect(() => {
		tabs.hydrate();
	});

	const modals = createUrlSyncedModals<SubjectDrawerModal>({
		allowed: ['edit-subject', 'add-chapter', 'edit-chapter'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editSubjectOpen = bindUrlModal(modals, 'edit-subject');
	const addChapterOpen = bindUrlModal(modals, 'add-chapter');
	const editChapterOpen = bindUrlModal(modals, 'edit-chapter');

	let matterRows = $state<SubjectMatterDrawerRow[]>([]);
	let matterContext = $state<{
		catalogSubjectId: string;
		gradeLevelSubjectId?: string;
		classGroupId: string;
	} | null>(null);
	let editingMatter = $state<SubjectMatterDrawerRow | null>(null);

	const headerSummary = $derived(
		matterRows.length > 0
			? buildSubjectChapterSummary(matterRows.map(row => row.name))
			: s.description,
	);

	const tabItems = $derived([
		{ key: 'progression', label: $t('subjects.tab.chapters') },
		{ key: 'logbook', label: $t('subjects.tab.logbook') },
	] as const);

	const entries = $derived(teachingLogContext.resolveSubjectEntries(s.name, s.classId));

	const teacherInitials = $derived(
		s.teacher
			.split(/\s+/)
			.map(p => p[0])
			.filter(Boolean)
			.slice(0, 2)
			.join('')
			.toUpperCase(),
	);

	const chaptersData = $derived.by(() => {
		const byChapter: Record<string, number> = {};
		for (const e of entries) {
			const prev = byChapter[e.chapter];
			if (prev === undefined || e.progress > prev)
				byChapter[e.chapter] = e.progress;
		}
		const chapters = Object.entries(byChapter);
		const overall = chapters.length
			? Math.round(chapters.reduce((a, [, p]) => a + p, 0) / chapters.length)
			: 0;
		return { chapters, overall };
	});

	async function refreshMatterRows() {
		const loaded = await loadSubjectMatterDrawerRows(s.id);
		matterContext = {
			catalogSubjectId: loaded.catalogSubjectId,
			gradeLevelSubjectId: loaded.gradeLevelSubjectId,
			classGroupId: loaded.classGroupId,
		};
		matterRows = loaded.rows;
	}

	$effect(() => {
		void s.id;
		void refreshMatterRows();
	});

	function openEditChapter(row: SubjectMatterDrawerRow) {
		editingMatter = row;
		modals.open('edit-chapter');
	}

	function handleMatterSaved(row: SubjectMatterDrawerRow) {
		const index = matterRows.findIndex(entry => entry.id === row.id);
		if (index >= 0) {
			matterRows = matterRows.map(entry => (entry.id === row.id ? row : entry));
			return;
		}
		matterRows = [...matterRows, row].sort((left, right) => left.sequenceOrder - right.sequenceOrder);
	}

	async function removeChapter(row: SubjectMatterDrawerRow): Promise<boolean> {
		const ok = await deleteSubjectMatterMutation(
			row.id,
			get(t)('subjects.chapters.deleteSuccess', { name: row.name }),
		);
		if (ok) {
			matterRows = matterRows.filter(entry => entry.id !== row.id);
		}
		return ok;
	}

	async function confirmDeleteSubject() {
		deleteBusy = true;
		try {
			const ok = await deleteClassSubjectMutation(s.id, {
				successMessage: get(t)('subjects.toastDeleted', { name: s.name }),
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
	<DrawerEntityHeader name={s.name} summary={headerSummary}>
		{#snippet chips()}
			<span class="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] tabular-nums text-foreground/80">
				{$t('subjects.hoursPerWeek', { h: s.hoursPerWeek })}
			</span>
			<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground/80">
				{s.teacher}
			</span>
		{/snippet}
		{#snippet avatar()}
			<span
				class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-display text-sm font-semibold text-primary-foreground"
			>
				{teacherInitials}
			</span>
		{/snippet}
		{#snippet actions()}
			<Button variant="outline" size="sm" class="rounded-full" onclick={() => modals.open('edit-subject')}>
				{$t('common.edit')}
			</Button>
		{/snippet}
		{#snippet overflow()}
			<RowActionMenuItem destructive onclick={() => (deleteOpen = true)}>
				{$t('common.delete')}
			</RowActionMenuItem>
		{/snippet}
	</DrawerEntityHeader>

	<DrawerTabBar tabs={tabItems} active={tabs.tab} onSelect={key => tabs.select(key as SubjectTab)} />

	{#if tabs.tab === 'progression'}
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
								<Button variant="ghost" size="sm" class="h-8 rounded-full" onclick={() => openEditChapter(row)}>
									{$t('common.edit')}
								</Button>
								<DeleteEntityButton
									confirmTitle={$t('common.deleteConfirmTitle')}
									confirmDescription={$t('subjects.chapters.deleteConfirm', { name: row.name })}
									onConfirm={() => removeChapter(row)}
								/>
							</div>
						</div>
					</div>
				{:else}
					<p class="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
						{$t('subjects.chapters.empty')}
					</p>
				{/each}
			</section>

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
				{#each chaptersData.chapters as [chapter, p] (chapter)}
					<div class="rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
						<div class="flex items-center justify-between gap-3">
							<p class="text-sm font-semibold">{chapter}</p>
							<span class="font-mono text-xs text-muted-foreground">{p}%</span>
						</div>
						<div class="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
							<div class="h-full bg-primary" style="width: {p}%"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="space-y-3">
			{#each entries as e (e.id)}
				<article class="rounded-2xl border border-border bg-card p-4 shadow-soft">
					<header class="mb-2 flex items-start justify-between gap-2">
						<div>
							<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
								{new Date(e.date).toLocaleDateString('fr-FR', {
									weekday: 'short',
									day: '2-digit',
									month: 'short',
									year: 'numeric',
								})}
							</p>
							<h4 class="mt-0.5 font-display text-sm font-semibold">{e.chapter}</h4>
						</div>
						<span class="font-mono text-[10px] text-muted-foreground">{e.progress}%</span>
					</header>
					<p class="text-xs leading-relaxed text-foreground/80">{e.content}</p>
					{#if e.objectives.length > 0}
						<ul class="mt-2 space-y-1">
							{#each e.objectives as o (o)}
								<li class="flex items-start gap-1.5 text-[11px]">
									<Check class="mt-0.5 h-3 w-3 text-accent" />
									{o}
								</li>
							{/each}
						</ul>
					{/if}
					{#if e.homework || e.attachments?.length}
						<div class="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[11px]">
							{#if e.homework}
								<span class="flex items-center gap-1 text-muted-foreground">
									<FileText class="h-3 w-3" />
									<span class="font-medium text-foreground">{$t('teaching.homework')} :</span>
									{e.homework}
								</span>
							{/if}
							{#each e.attachments ?? [] as a (a)}
								<span
									class="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground"
								>
									<Paperclip class="h-3 w-3" />
									{a}
								</span>
							{/each}
						</div>
					{/if}
				</article>
			{:else}
				<p class="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
					{$t('teaching.empty')}
				</p>
			{/each}
		</div>
	{/if}
</div>

<SubjectFormModal subject={s} bind:open={editSubjectOpen.open} showTrigger={false} />

{#if matterContext}
	<SubjectMatterFormModal
		bind:open={addChapterOpen.open}
		subjectId={matterContext.catalogSubjectId}
		classSubjectId={s.id}
		classGroupId={matterContext.classGroupId}
		gradeLevelSubjectId={matterContext.gradeLevelSubjectId}
		defaultSequenceOrder={matterRows.length + 1}
		onSaved={handleMatterSaved}
	/>
	<SubjectMatterFormModal
		bind:open={editChapterOpen.open}
		matter={editingMatter}
		subjectId={matterContext.catalogSubjectId}
		classSubjectId={s.id}
		classGroupId={matterContext.classGroupId}
		gradeLevelSubjectId={matterContext.gradeLevelSubjectId}
		onSaved={handleMatterSaved}
	/>
{/if}

<ConfirmModal
	bind:open={deleteOpen}
	title={$t('common.deleteConfirmTitle')}
	description={$t('subjects.deleteConfirm', { name: s.name })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	onConfirm={confirmDeleteSubject}
/>

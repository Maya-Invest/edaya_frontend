<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { page } from '$app/stores';
	import { deleteClassSubjectMutation } from '$lib/api/mutations/delete-entity.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import DrawerTabBar from '$lib/components/ui/DrawerTabBar.svelte';
	import { createUrlSyncedDrawerTabs } from '$lib/drawer/drawer-tabs-state.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { t } from '$lib/i18n';
	import { Check, FileText, Paperclip } from '$lib/icons';
	import { teachingLogContext } from '$lib/teaching-log/context.svelte';
	import { get } from 'svelte/store';
	import DrawerActionBar from '../shared/DrawerActionBar.svelte';
	import SubjectFormModal from './SubjectFormModal.svelte';

	const { s }: { s: Subject } = $props();

	type SubjectDrawerModal = 'edit-subject';

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
		allowed: ['edit-subject'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editSubjectOpen = bindUrlModal(modals, 'edit-subject');

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
</script>

<div class="space-y-5">
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0 flex-1">
			<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
				{$t('subjects.hoursPerWeek', { h: s.hoursPerWeek })}
			</p>
			<h3 class="mt-1 font-display text-2xl font-semibold">{s.name}</h3>
			<p class="mt-2 text-sm text-muted-foreground">{s.description}</p>
		</div>
		<div class="flex shrink-0 items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-soft">
			<span
				class="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-display text-xs font-semibold text-primary-foreground"
			>
				{teacherInitials}
			</span>
			<div class="flex flex-col leading-tight">
				<span class="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
					{$t('subjects.teacher')}
				</span>
				<span class="text-xs font-semibold">{s.teacher}</span>
			</div>
		</div>
	</div>

	<DrawerActionBar>
		<Button variant="outline" size="sm" class="rounded-full" onclick={() => modals.open('edit-subject')}>
			{$t('common.edit')}
		</Button>
		<DeleteEntityButton
			confirmTitle={$t('common.deleteConfirmTitle')}
			confirmDescription={$t('subjects.deleteConfirm', { name: s.name })}
			onConfirm={() => deleteClassSubjectMutation(s.id, {
				successMessage: get(t)('subjects.toastDeleted', { name: s.name }),
			})}
		/>
	</DrawerActionBar>

	<DrawerTabBar tabs={tabItems} active={tabs.tab} onSelect={key => tabs.select(key as SubjectTab)} />

	{#if tabs.tab === 'progression'}
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
				{:else}
					<p class="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
						—
					</p>
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

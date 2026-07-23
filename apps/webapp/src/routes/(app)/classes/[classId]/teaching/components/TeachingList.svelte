<script lang="ts">
	import type { Subject, SubjectCategory } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { downloadClassLogbook } from '$lib/api/logbook-pdf';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { locale, t } from '$lib/i18n';
	import { Clock, Download, Search, Sparkles, User } from '$lib/icons';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { readTeachingListFilters, writeTeachingListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getTeachingPageState } from '../teaching-page.svelte';

	const {
		classId,
		selectedId,
	}: {
		classId: string;
		selectedId?: string;
	} = $props();

	const teachingPage = getTeachingPageState();
	const subjects = $derived(teachingPage.subjectsFor(classId));
	const overallProgress = $derived(teachingPage.overallProgress(classId));
	const initialFilters = $derived(readTeachingListFilters($page.url));
	let downloading = $state(false);

	const listFilters = new ListFiltersState<{ q: string }>(
		{
			getUrl: () => $page.url,
			write: writeTeachingListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readTeachingListFilters($page.url),
	);

	const filteredSubjects = $derived(
		subjects.filter((subject) => {
			const needle = listFilters.values.q.trim().toLowerCase();
			if (!needle) {
				return true;
			}
			return subject.name.toLowerCase().includes(needle)
				|| subject.teacher.toLowerCase().includes(needle)
				|| subject.category.toLowerCase().includes(needle);
		}),
	);

	const dotColor: Record<Subject['color'], string> = {
		mint: 'bg-accent',
		sky: 'bg-accent/60',
		warm: 'bg-muted-foreground/40',
	};

	const categoryTone: Record<SubjectCategory, string> = {
		'Scientifique': 'bg-secondary text-foreground/80',
		'Littéraire': 'bg-secondary text-foreground/80',
		'Langues': 'bg-secondary text-foreground/80',
		'Sciences humaines': 'bg-secondary text-foreground/80',
		'Sport': 'bg-secondary text-foreground/80',
		'Arts': 'bg-secondary text-foreground/80',
	};

	function selectSubject(subject: Subject) {
		const path = detailHref.classTeachingSubjectTab(classId, subject.id, 'progression');
		appGoto(path);
	}

	async function downloadLogbook() {
		if (downloading) {
			return;
		}
		downloading = true;
		try {
			const scope = academicContext.resolveSelectionForApi();
			const result = await downloadClassLogbook({
				classGroupId: classId,
				academicPeriodId: scope?.academicPeriodId,
				locale: get(locale).startsWith('en') ? 'en' : 'fr',
			});
			if (result.status === 'ready') {
				toast.info(get(t)('teaching.toastLogbookReady'));
				return;
			}
			if (result.status === 'empty') {
				toast.info(get(t)('teaching.toastLogbookEmpty'));
				return;
			}
			if (result.status === 'not_configured') {
				toast.error(get(t)('teaching.toastLogbookNotConfigured'));
				return;
			}
			toast.error(get(t)('teaching.toastLogbookError'));
		}
		catch {
			toast.error(get(t)('teaching.toastLogbookError'));
		}
		finally {
			downloading = false;
		}
	}

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
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('teaching.eyebrow')}
		title={$t('teaching.title')}
		description={$t('teaching.subtitle')}
	>
		{#snippet search()}
			<div class="relative">
				<Search
					class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={listFilters.values.q}
					oninput={() => listFilters.scheduleSync()}
					placeholder={$t('common.search')}
					class="h-9 w-56 rounded-full pl-9 text-sm"
				/>
			</div>
		{/snippet}
		{#snippet filters()}
			<div
				class="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-soft"
			>
				<Sparkles class="h-4 w-4 text-accent" />
				<div>
					<p class="text-[10px] uppercase tracking-wider text-muted-foreground">
						{$t('teaching.overallProgress')}
					</p>
					<div class="mt-0.5 flex items-center gap-2">
						<div class="h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
							<div class="h-full bg-accent" style:width="{overallProgress}%"></div>
						</div>
						<span class="font-mono text-xs">{overallProgress}%</span>
					</div>
				</div>
			</div>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
		{#snippet primary()}
			<PermissionGate
				permission="CLASS_LOGBOOK_READ"
				classId={classId}
				mode="disable"
				tooltip={$t('teaching.downloadLogbook')}
			>
				{#snippet children({ disabled, title })}
					<Button
						class="rounded-full"
						disabled={disabled || downloading}
						{title}
						onclick={downloadLogbook}
					>
						<Download class="h-4 w-4" />
						{$t('teaching.downloadLogbook')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
	</ListPageHeader>

	<div class="mb-2">
		<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
			{$t('teaching.progressByMatter')}
		</p>
	</div>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		{#each filteredSubjects as subject, idx (subject.id)}
			{@const active = selectedId === subject.id}
			{@const progress = teachingPage.subjectProgress(subject)}
			<button
				type="button"
				onclick={() => selectSubject(subject)}
				class={cn(
					'flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary',
					idx !== filteredSubjects.length - 1 && 'border-b border-border',
					active && 'bg-primary/10',
				)}
			>
				<div class={cn('h-8 w-1.5 shrink-0 rounded-full', dotColor[subject.color])}></div>
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<span class="font-display text-sm font-semibold">{subject.name}</span>
						<span
							class={cn(
								'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
								categoryTone[subject.category],
							)}
						>
							{subject.category}
						</span>
					</div>
					<p class="mt-0.5 truncate text-xs text-muted-foreground">{subject.description}</p>
				</div>
				<div class="flex shrink-0 items-center gap-5 text-xs text-muted-foreground">
					<span class="flex items-center gap-2">
						<span class="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
							<span class="block h-full bg-accent" style:width="{progress}%"></span>
						</span>
						<span class="font-mono tabular-nums">{progress}%</span>
					</span>
					<span class="flex items-center gap-1.5">
						<User class="h-3.5 w-3.5" />
						{subject.teacher}
					</span>
					<span class="flex items-center gap-1.5">
						<Clock class="h-3.5 w-3.5" />
						{subject.hoursPerWeek}h
					</span>
				</div>
			</button>
		{:else}
			<p class="px-5 py-10 text-center text-sm text-muted-foreground">{$t('subjects.none')}</p>
		{/each}
	</div>
</div>

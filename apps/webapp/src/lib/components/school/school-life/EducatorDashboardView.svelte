<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import {
		Lock,
		Eye,
		ShieldCheck,
		AlertTriangle,
		Clock,
		CalendarX2,
		GraduationCap,
		Pencil,
		Plus,
		Search,
	} from '$lib/icons';
	import { readEducatorDashboardListFilters, writeEducatorDashboardListFilters } from '$lib/list/list-url-filters';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { canEditGrades } from '$lib/permissions';
	import { INCIDENT_SEVERITY_TONE } from '$lib/ui-tones';
	import { cn } from '$lib/utils';

	type Tab = 'schoollife' | 'grades';

	const students = $derived(detailDataContext.students);
	const absences = $derived(detailDataContext.absences);
	const incidents = $derived(detailDataContext.incidents);
	const evaluations = $derived(detailDataContext.evaluations);
	const classes = $derived(academicContext.classes);

	const me = $derived(authSession.user);

	const initialFilters = $derived(readEducatorDashboardListFilters($page.url));

	const listFilters = new ListFiltersState<{ q: string; tab: string }>(
		{
			getUrl: () => $page.url,
			write: writeEducatorDashboardListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readEducatorDashboardListFilters($page.url),
	);

	const tab = $derived(
		listFilters.values.tab === 'grades' ? 'grades' as const : 'schoollife' as const,
	);

	const studentsBySearch = $derived.by(() => {
		const term = listFilters.values.q.trim().toLowerCase();
		if (!term)
			return students;
		return students.filter(s => s.name.toLowerCase().includes(term));
	});

	const recentAbsences = $derived(
		[...absences].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8),
	);
	const recentIncidents = $derived(
		[...incidents].sort((a, b) => (a.date < b.date ? 1 : -1)),
	);
	const lateness = $derived(incidents.filter(i => i.category === 'Tardiness'));
	const discipline = $derived(
		incidents.filter(i => i.category === 'Behavior' || i.category === 'Conflict'),
	);

	const tabItems = [
		{ k: 'schoollife' as const, labelKey: 'educator.schoolLife' },
		{ k: 'grades' as const, labelKey: 'educator.gradesReadOnly' },
	];

	const kpiToneClass = {
		warm: 'bg-primary text-primary-foreground',
		sky: 'bg-secondary text-foreground/80',
		mint: 'bg-primary text-primary-foreground',
		destructive: 'bg-destructive/10 text-destructive',
	} as const;

	function schoolAverage() {
		if (students.length === 0)
			return '0';
		const avg = students.reduce((acc, s) => acc + s.average, 0) / students.length;
		return avg.toFixed(1);
	}

	const editable = canEditGrades();

	$effect(() => {
		listFilters.hydrate({
			q: initialFilters.q,
			tab: initialFilters.tab === 'grades' ? 'grades' : 'schoollife',
		});
	});

	$effect(() => {
		if (!listFilters.ready) {
			return;
		}
		void listFilters.values.tab;
		listFilters.scheduleSync();
	});

	function applyTab(next: Tab) {
		listFilters.values.tab = next;
		listFilters.scheduleSync();
	}
</script>

{#snippet panel(title: string, subtitle: string | undefined, action: Snippet | undefined, children: Snippet)}
	<section class="rounded-2xl border border-border bg-card p-5 shadow-soft">
		<header class="mb-3 flex items-start justify-between gap-3">
			<div>
				<h3 class="font-display text-base font-semibold">{title}</h3>
				{#if subtitle}
					<p
						class="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
					>
						<ShieldCheck class="h-3 w-3" />
						{subtitle}
					</p>
				{/if}
			</div>
			{#if action}
				{@render action()}
			{/if}
		</header>
		{@render children()}
	</section>
{/snippet}

<div class="animate-fade-in space-y-6">
	<ListPageHeader
		eyebrow={$t('educator.dashboard')}
		title={me?.name ?? $t('educator.dashboard')}
		description={me ? `${$t(`staff.role.${me.role}`)} · ${me.department}` : undefined}
	>
		{#snippet search()}
			{#if tab === 'grades'}
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
			{/if}
		{/snippet}
		{#snippet filters()}
			<div class="flex w-fit items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
				{#each tabItems as x (x.k)}
					{@const active = tab === x.k}
					<button
						type="button"
						onclick={() => applyTab(x.k)}
						class={cn(
							'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition',
							active
								? 'bg-primary text-primary-foreground shadow-soft'
								: 'text-muted-foreground hover:text-foreground',
						)}
					>
						{#if x.k === 'schoollife'}
							<ShieldCheck class="h-3.5 w-3.5" />
						{:else}
							<Eye class="h-3.5 w-3.5" />
						{/if}
						{$t(x.labelKey)}
					</button>
				{/each}
			</div>
		{/snippet}
		{#snippet more()}
			<span
				class="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground/80"
			>
				<ShieldCheck class="h-3.5 w-3.5" />
				{$t('educator.fullAccess')} — {$t('educator.schoolLife')}
			</span>
			<span
				class="inline-flex items-center gap-1.5 rounded-full bg-highlight-soft px-2.5 py-1 text-[11px] font-medium text-highlight"
			>
				<Lock class="h-3.5 w-3.5" />
				{$t('educator.viewOnly')} — {$t('educator.gradesReadOnly')}
			</span>
		{/snippet}
	</ListPageHeader>

	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
			<div class="flex items-center justify-between">
				<div class={cn('flex h-9 w-9 items-center justify-center rounded-xl', kpiToneClass.warm)}>
					<CalendarX2 class="h-4 w-4" />
				</div>
				<span
					class="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground"
				>
					<ShieldCheck class="h-3 w-3" />
					{$t('educator.fullAccess')}
				</span>
			</div>
			<p class="mt-3 font-display text-2xl font-semibold tabular-nums">{absences.length}</p>
			<p class="mt-0.5 text-xs text-muted-foreground">{$t('educator.absences')}</p>
		</div>
		<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
			<div class="flex items-center justify-between">
				<div class={cn('flex h-9 w-9 items-center justify-center rounded-xl', kpiToneClass.sky)}>
					<Clock class="h-4 w-4" />
				</div>
				<span
					class="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground"
				>
					<ShieldCheck class="h-3 w-3" />
					{$t('educator.fullAccess')}
				</span>
			</div>
			<p class="mt-3 font-display text-2xl font-semibold tabular-nums">{lateness.length}</p>
			<p class="mt-0.5 text-xs text-muted-foreground">{$t('educator.lateness')}</p>
		</div>
		<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
			<div class="flex items-center justify-between">
				<div
					class={cn('flex h-9 w-9 items-center justify-center rounded-xl', kpiToneClass.destructive)}
				>
					<AlertTriangle class="h-4 w-4" />
				</div>
				<span
					class="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground"
				>
					<ShieldCheck class="h-3 w-3" />
					{$t('educator.fullAccess')}
				</span>
			</div>
			<p class="mt-3 font-display text-2xl font-semibold tabular-nums">{discipline.length}</p>
			<p class="mt-0.5 text-xs text-muted-foreground">{$t('educator.discipline')}</p>
		</div>
		<div class="rounded-2xl border border-border bg-card p-4 shadow-soft">
			<div class="flex items-center justify-between">
				<div class={cn('flex h-9 w-9 items-center justify-center rounded-xl', kpiToneClass.mint)}>
					<GraduationCap class="h-4 w-4" />
				</div>
				<span
					class="inline-flex items-center gap-1 text-[10px] font-medium text-highlight"
				>
					<Lock class="h-3 w-3" />
					{$t('educator.viewOnly')}
				</span>
			</div>
			<p class="mt-3 font-display text-2xl font-semibold tabular-nums">
				{schoolAverage()}<span class="ml-0.5 text-sm text-muted-foreground">/20</span>
			</p>
			<p class="mt-0.5 text-xs text-muted-foreground">{$t('educator.average')}</p>
		</div>
	</div>

	{#if tab === 'schoollife'}
		<div class="grid gap-4 lg:grid-cols-2">
			{@render panel($t('educator.absences'), $t('educator.fullAccess'), absencesAction, absencesList)}
			{@render panel(
				`${$t('educator.discipline')} & ${$t('educator.lateness')}`,
				$t('educator.fullAccess'),
				incidentsAction,
				incidentsList,
			)}
		</div>
	{:else}
		<div class="space-y-4">
			<div
				class="flex items-start gap-3 rounded-xl border border-highlight/20 bg-highlight-soft p-4 text-sm text-foreground/80"
			>
				<Lock class="mt-0.5 h-4 w-4 shrink-0" />
				<p>{$t('educator.readOnlyHint')}</p>
			</div>

			<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
				<div
					class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
				>
					<div class="col-span-4">{$t('people.name')}</div>
					<div class="col-span-3">{$t('educator.class')}</div>
					<div class="col-span-2">{$t('educator.average')}</div>
					<div class="col-span-3 text-right">{$t('educator.evaluations')}</div>
				</div>
				<ul>
					{#each studentsBySearch as s (s.id)}
						{@const cls = classes.find(c => c.id === s.classId)}
						{@const evals = evaluations.filter(e => e.classId === s.classId).slice(0, 3)}
						<li
							class="grid grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 text-sm last:border-b-0"
						>
							<div class="col-span-4 flex items-center gap-3">
								<div
									class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-xs font-semibold text-primary-foreground"
								>
									{s.initials}
								</div>
								<p class="truncate font-medium">{s.name}</p>
							</div>
							<div class="col-span-3 text-foreground/80">{cls?.name ?? s.classId}</div>
							<div class="col-span-2 flex items-center gap-1.5">
								<Lock class="h-3 w-3 text-muted-foreground" aria-hidden="true" />
								<span
									class={cn(
										'font-mono text-sm tabular-nums',
										s.average >= 16 && 'text-primary',
										s.average < 10 && 'text-destructive',
									)}
								>
									{s.average.toFixed(1)}
								</span>
								<span class="text-[10px] text-muted-foreground">/20</span>
							</div>
							<div class="col-span-3 flex flex-wrap items-center justify-end gap-1">
								{#each evals as e (e.id)}
									<span
										title="{e.title} — {e.subject}"
										class="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
									>
										{e.averageMark ? e.averageMark.toFixed(1) : '—'}
									</span>
								{/each}
								<Button
									size="icon"
									variant="ghost"
									class="h-7 w-7 opacity-40"
									disabled={!editable}
									title={$t('educator.readOnlyHint')}
								>
									<Pencil class="h-3.5 w-3.5" />
								</Button>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
</div>

{#snippet absencesAction()}
	<Button size="sm" class="rounded-full">
		<Plus class="mr-1 h-3.5 w-3.5" />
		{$t('educator.logAbsence')}
	</Button>
{/snippet}

{#snippet incidentsAction()}
	<Button size="sm" class="rounded-full">
		<Plus class="mr-1 h-3.5 w-3.5" />
		{$t('educator.logIncident')}
	</Button>
{/snippet}

{#snippet absencesList()}
	<ul class="divide-y divide-border">
		{#each recentAbsences as a (a.id)}
			{@const s = students.find(x => x.id === a.studentId)}
			<li class="flex items-center justify-between gap-3 py-3 text-sm">
				<div class="min-w-0">
					<p class="truncate font-medium">{s?.name ?? a.studentId}</p>
					<p class="text-xs text-muted-foreground">
						{a.date} · {a.time} · {a.subject}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
						{a.eventType}
					</span>
					<Button size="icon" variant="ghost" class="h-7 w-7">
						<Pencil class="h-3.5 w-3.5" />
					</Button>
				</div>
			</li>
		{/each}
	</ul>
{/snippet}

{#snippet incidentsList()}
	<ul class="divide-y divide-border">
		{#each recentIncidents as i (i.id)}
			{@const s = students.find(x => x.id === i.studentId)}
			<li class="flex items-start justify-between gap-3 py-3 text-sm">
				<div class="min-w-0">
					<p class="truncate font-medium">{s?.name ?? i.studentId}</p>
					<p class="text-xs text-muted-foreground">
						{i.date} · {i.category}
					</p>
					<p class="mt-1 text-xs text-foreground/80">{i.summary}</p>
				</div>
				<span
					class={cn(
						'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
						INCIDENT_SEVERITY_TONE[i.severity],
					)}
				>
					{i.severity}
				</span>
			</li>
		{/each}
	</ul>
{/snippet}

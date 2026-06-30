<script lang="ts">
	import type { Subject, SubjectCategory } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Clock, User, Layers, Tag, ChevronRight, Search } from '$lib/icons';
	import { readConfigSubjectListFilters, writeConfigSubjectListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';

	const {
		onSelect,
		selectedId,
		onSelectLevel,
	}: {
		onSelect?: (s: Subject) => void;
		selectedId?: string;
		onSelectLevel?: (group: { label: string; subtitle: string; items: Subject[] }) => void;
	} = $props();

	const subjects = $derived(detailDataContext.subjects);
	const classes = $derived(academicContext.classes);

	type Mode = 'level' | 'category';

	const initialFilters = $derived(readConfigSubjectListFilters($page.url));

	let q = $state('');
	let mode = $state<Mode>('level');
	let filtersReady = $state(false);

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

	function yearLabel(className: string): string {
		const map: Record<string, string> = {
			'6th': '6ème',
			'5th': '5ème',
			'4th': '4ème',
			'3rd': '3ème',
			'2nd': '2nde',
			'1st': '1ère',
			'Terminale': 'Terminale',
		};
		for (const key of Object.keys(map)) {
			if (className.startsWith(key))
				return map[key];
		}
		return className;
	}

	const classById = $derived(Object.fromEntries(classes.map(c => [c.id, c])));

	function matchesSearch(s: Subject, needle: string) {
		if (!needle)
			return true;
		const cls = classById[s.classId];
		return s.name.toLowerCase().includes(needle)
			|| s.teacher.toLowerCase().includes(needle)
			|| s.category.toLowerCase().includes(needle)
			|| s.description.toLowerCase().includes(needle)
			|| (cls?.name.toLowerCase().includes(needle) ?? false);
	}

	const filteredSubjects = $derived(
		subjects.filter(s => matchesSearch(s, q.trim().toLowerCase())),
	);

	const groups = $derived.by(() => {
		if (mode === 'level') {
			const order = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'];
			const byYear: Record<string, { subtitle: string; items: Subject[] }> = {};
			for (const s of filteredSubjects) {
				const cls = classById[s.classId];
				if (!cls)
					continue;
				const y = yearLabel(cls.name);
				if (!byYear[y])
					byYear[y] = { subtitle: cls.level, items: [] };
				byYear[y].items.push(s);
			}
			return order
				.filter(y => byYear[y]?.items.length)
				.map(y => ({
					key: y,
					label: y,
					subtitle: byYear[y].subtitle,
					count: byYear[y].items.length,
					items: byYear[y].items,
				}));
		}
		const order: SubjectCategory[] = [
			'Scientifique',
			'Littéraire',
			'Langues',
			'Sciences humaines',
			'Sport',
			'Arts',
		];
		const byCat: Record<string, Subject[]> = {};
		for (const s of filteredSubjects) {
			(byCat[s.category] ||= []).push(s);
		}
		return order
			.filter(c => byCat[c]?.length)
			.map(c => ({
				key: c,
				label: c,
				subtitle: '',
				count: byCat[c].length,
				items: byCat[c],
			}));
	});

	function syncFiltersToUrl() {
		const href = writeConfigSubjectListFilters($page.url, { q, mode });
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		const next = initialFilters;
		q = next.q;
		mode = next.mode === 'category' ? 'category' : 'level';
		filtersReady = true;
	});

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	function scheduleFilterSync() {
		if (!filtersReady)
			return;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(syncFiltersToUrl, 250);
	}

	function applyMode(next: Mode) {
		mode = next;
		scheduleFilterSync();
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('subjects.curriculum')}
		title={$t('subjects.count', { n: filteredSubjects.length })}
	>
		{#snippet search()}
			<div class="relative">
				<Search
					class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={q}
					oninput={scheduleFilterSync}
					placeholder={$t('common.search')}
					class="h-9 w-56 rounded-full pl-9 text-sm"
				/>
			</div>
		{/snippet}
		{#snippet filters()}
			<div class="inline-flex rounded-full border border-border bg-card p-1 shadow-soft">
				<button
					type="button"
					onclick={() => applyMode('level')}
					class={cn(
						'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
						mode === 'level'
							? 'bg-primary text-primary-foreground'
							: 'text-muted-foreground hover:text-foreground',
					)}
				>
					<Layers class="h-3.5 w-3.5" />
					{$t('subjects.viewByLevel')}
				</button>
				<button
					type="button"
					onclick={() => applyMode('category')}
					class={cn(
						'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
						mode === 'category'
							? 'bg-primary text-primary-foreground'
							: 'text-muted-foreground hover:text-foreground',
					)}
				>
					<Tag class="h-3.5 w-3.5" />
					{$t('subjects.viewByCategory')}
				</button>
			</div>
		{/snippet}
	</ListPageHeader>

	{#if mode === 'level'}
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
			{#each groups as g, idx (g.key)}
				{@const totalHours = g.items.reduce((sum, s) => sum + s.hoursPerWeek, 0)}
				<button
					type="button"
					onclick={() => onSelectLevel?.({ label: g.label, subtitle: g.subtitle, items: g.items })}
					class={cn(
						'group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary',
						idx !== groups.length - 1 && 'border-b border-border',
					)}
				>
					<div class="h-8 w-1.5 shrink-0 rounded-full bg-accent"></div>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span class="font-display text-sm font-semibold">{g.label}</span>
							<span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
								{g.subtitle}
							</span>
						</div>
						<p class="mt-0.5 truncate text-xs text-muted-foreground">
							{g.items
								.slice(0, 4)
								.map(s => s.name)
								.join(' · ')}{g.items.length > 4 ? ' …' : ''}
						</p>
					</div>
					<div class="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
						<span class="rounded-full bg-secondary px-2 py-0.5 font-mono tabular-nums">
							{$t('subjects.count', { n: g.items.length })}
						</span>
						<span class="font-mono tabular-nums">{$t('subjects.hoursPerWeek', { h: totalHours })}</span>
						<ChevronRight
							class="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-accent"
						/>
					</div>
				</button>
			{:else}
				<p class="px-5 py-10 text-center text-sm text-muted-foreground">{$t('subjects.none')}</p>
			{/each}
		</div>
	{:else}
		<div class="space-y-8">
			{#each groups as g (g.key)}
				{@const totalHours = g.items.reduce((sum, s) => sum + s.hoursPerWeek, 0)}
				<section>
					<div class="mb-3 flex items-end justify-between border-b border-border pb-2">
						<div class="flex items-baseline gap-3">
							<h3 class="font-display text-lg font-semibold">{g.label}</h3>
							<span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
								{$t('subjects.count', { n: g.count })}
							</span>
						</div>
						<div class="flex items-center gap-3 text-xs text-muted-foreground">
							<span class="font-mono tabular-nums">{$t('subjects.hoursPerWeek', { h: totalHours })}</span>
						</div>
					</div>

					<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
						{#each g.items as s, idx (s.id)}
							{@const active = selectedId === s.id}
							{@const cls = classById[s.classId]}
							<button
								type="button"
								onclick={() => onSelect?.(s)}
								class={cn(
									'flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary',
									idx !== g.items.length - 1 && 'border-b border-border',
									active && 'bg-primary/10',
								)}
							>
								<div class={cn('h-8 w-1.5 shrink-0 rounded-full', dotColor[s.color])}></div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="font-display text-sm font-semibold">{s.name}</span>
										<span
											class={cn(
												'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
												categoryTone[s.category],
											)}
										>
											{s.category}
										</span>
									</div>
									<p class="mt-0.5 truncate text-xs text-muted-foreground">{s.description}</p>
								</div>
								<div class="flex shrink-0 items-center gap-5 text-xs text-muted-foreground">
									<span class="flex items-center gap-1.5">
										<User class="h-3.5 w-3.5" />
										{s.teacher}
									</span>
									<span class="flex items-center gap-1.5">
										<Clock class="h-3.5 w-3.5" />
										{s.hoursPerWeek}h
									</span>
									{#if cls}
										<span class="flex items-center gap-1.5">
											<span class="font-mono text-[10px]">{cls.name}</span>
										</span>
									{/if}
								</div>
							</button>
						{/each}
					</div>
				</section>
			{:else}
				<p class="py-10 text-center text-sm text-muted-foreground">{$t('subjects.none')}</p>
			{/each}
		</div>
	{/if}
</div>

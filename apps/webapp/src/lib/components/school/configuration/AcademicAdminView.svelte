<script lang="ts">
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import {
		activateAcademicYearMutation,
		publishAcademicPeriodMutation,
	} from '$lib/api/mutations/academic.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { t } from '$lib/i18n';
	import { CalendarRange, ChevronDown, Plus, Search } from '$lib/icons';
	import { readAcademicAdminListFilters, writeAcademicAdminListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import AcademicYearCreateModal from './AcademicYearCreateModal.svelte';

	const initialFilters = $derived(readAcademicAdminListFilters($page.url));

	let q = $state('');
	let filtersReady = $state(false);
	let createOpen = $state(false);
	let expandedYear = $state<string | null>(academicContext.yearId);

	const sortedYears = $derived(
		[...academicContext.years].sort((a, b) => b.startDate.localeCompare(a.startDate)),
	);

	const filteredYears = $derived(
		sortedYears.filter((year) => {
			const needle = q.trim().toLowerCase();
			if (!needle)
				return true;
			return year.label.toLowerCase().includes(needle)
				|| year.startDate.includes(needle)
				|| year.endDate.includes(needle)
				|| year.status.toLowerCase().includes(needle);
		}),
	);

	function periodsFor(yearId: string) {
		return academicContext.periods
			.filter(p => p.academicYearId === yearId)
			.sort((a, b) => a.startDate.localeCompare(b.startDate));
	}

	function handleYearCreated(yearId: string) {
		expandedYear = yearId;
	}

	async function handlePublishYear(yearId: string) {
		const ok = await activateAcademicYearMutation(yearId);
		if (!ok) {
			return;
		}
		const year = academicContext.years.find(entry => entry.id === yearId);
		if (year) {
			toast.success(get(t)('academic.toastYearPublished', { label: year.label }));
		}
	}

	async function handlePublishPeriod(periodId: string) {
		const ok = await publishAcademicPeriodMutation(periodId);
		if (!ok) {
			return;
		}
		const period = academicContext.periods.find(entry => entry.id === periodId);
		if (period) {
			toast.success(get(t)('academic.toastPeriodPublished', { label: period.label }));
		}
	}

	function syncFiltersToUrl() {
		const href = writeAcademicAdminListFilters($page.url, { q });
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
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('academic.subtitle')}
		title={$t('academic.title')}
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
		{#snippet primary()}
			<Button size="sm" class="rounded-full" onclick={() => (createOpen = true)}>
				<Plus class="mr-1 h-4 w-4" />
				{$t('academic.createYear')}
			</Button>
		{/snippet}
	</ListPageHeader>

	<div class="space-y-3">
		{#each filteredYears as year (year.id)}
			{@const open = expandedYear === year.id}
			{@const yearPeriods = periodsFor(year.id)}
			<section class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
				<button
					type="button"
					class="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-secondary/40"
					onclick={() => (expandedYear = open ? null : year.id)}
				>
					<CalendarRange class="h-4 w-4 shrink-0 text-muted-foreground" />
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<h3 class="font-display font-semibold">{year.label}</h3>
							<span
								class={cn(
									'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide',
									year.status === 'published'
										? 'bg-accent/15 text-accent-foreground'
										: 'bg-secondary text-muted-foreground',
								)}
							>
								{year.status === 'published' ? $t('academic.published') : $t('academic.draft')}
							</span>
						</div>
						<p class="mt-0.5 font-mono text-xs text-muted-foreground">
							{year.startDate} → {year.endDate}
						</p>
					</div>
					<ChevronDown class={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
				</button>

				{#if open}
					<div class="border-t border-border px-5 py-4">
						{#if year.status === 'draft'}
							<div class="mb-4 flex justify-end">
								<Button
									size="sm"
									class="rounded-full"
									onclick={() => handlePublishYear(year.id)}
								>
									{$t('academic.publishYear')}
								</Button>
							</div>
						{/if}

						<p class="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
							{$t('academic.periods')}
						</p>
						<ul class="space-y-2">
							{#each yearPeriods as period (period.id)}
								{@const def = academicContext.periodDefinitionById(period.periodDefinitionId)}
								<li
									class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-4 py-3"
								>
									<div>
										<p class="text-sm font-medium">
											{period.label}
											{#if def}
												<span class="ml-2 text-xs text-muted-foreground">({def.name})</span>
											{/if}
										</p>
										<p class="font-mono text-[11px] text-muted-foreground">
											{period.range} · {period.startDate} → {period.endDate}
										</p>
									</div>
									<div class="flex items-center gap-2">
										<span
											class={cn(
												'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase',
												period.status === 'published'
													? 'bg-accent/15 text-accent-foreground'
													: 'bg-secondary text-muted-foreground',
											)}
										>
											{period.status === 'published'
												? $t('academic.published')
												: $t('academic.draft')}
										</span>
										{#if period.status === 'draft'}
											<Button
												size="sm"
												variant="outline"
												class="rounded-full"
												onclick={() => handlePublishPeriod(period.id)}
											>
												{$t('academic.publishPeriod')}
											</Button>
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</section>
		{/each}
	</div>
</div>

<AcademicYearCreateModal bind:open={createOpen} onCreated={handleYearCreated} />

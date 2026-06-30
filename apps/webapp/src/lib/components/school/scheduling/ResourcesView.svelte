<script lang="ts">
	import type { Resource } from '$lib/types/school';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Plus, Search } from '$lib/icons';
	import { readResourceListFilters, writeResourceListFilters } from '$lib/list/list-url-filters';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { RESOURCE_STATUS_TONE } from '$lib/ui-tones';
	import { cn } from '$lib/utils';

	const statusKeys = ['all', 'available', 'booked', 'maintenance'] as const;

	const initialFilters = $derived(readResourceListFilters($page.url));

	let q = $state('');
	let status = $state<(typeof statusKeys)[number]>('all');
	let filtersReady = $state(false);

	const filteredResources = $derived(
		detailDataContext.resources.filter((r: Resource) => {
			if (status !== 'all' && r.status !== status)
				return false;
			const needle = q.trim().toLowerCase();
			if (!needle)
				return true;
			return r.name.toLowerCase().includes(needle)
				|| r.location.toLowerCase().includes(needle)
				|| r.type.toLowerCase().includes(needle);
		}),
	);

	function statusLabel(k: (typeof statusKeys)[number]) {
		if (k === 'all')
			return $t('filter.all');
		return $t(`resourceStatus.${k}`);
	}

	function syncFiltersToUrl() {
		const href = writeResourceListFilters($page.url, { q, status });
		appGoto(href, { replaceState: true, keepFocus: true, noScroll: true });
	}

	$effect(() => {
		const next = initialFilters;
		q = next.q;
		status = (statusKeys.includes(next.status as (typeof statusKeys)[number])
			? next.status
			: 'all') as typeof status;
		filtersReady = true;
	});

	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	function scheduleFilterSync() {
		if (!filtersReady)
			return;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(syncFiltersToUrl, 250);
	}

	function applyStatus(next: (typeof statusKeys)[number]) {
		status = next;
		scheduleFilterSync();
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('resources.eyebrow')}
		title={$t('resources.count', { n: filteredResources.length })}
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
			<div class="flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1 shadow-soft">
				{#each statusKeys as k (k)}
					{@const active = status === k}
					<button
						type="button"
						onclick={() => applyStatus(k)}
						class={cn(
							'rounded-full px-3 py-1.5 text-xs font-medium transition',
							active
								? 'bg-primary text-primary-foreground shadow-soft'
								: 'text-muted-foreground hover:text-foreground',
						)}
					>
						{statusLabel(k)}
					</button>
				{/each}
			</div>
		{/snippet}
		{#snippet primary()}
			<Button size="sm" class="rounded-full">
				<Plus class="mr-1 h-4 w-4" />
				{$t('resources.newResource')}
			</Button>
		{/snippet}
	</ListPageHeader>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
		<div
			class="grid grid-cols-12 gap-4 border-b border-border bg-secondary/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			<div class="col-span-4">{$t('resources.name')}</div>
			<div class="col-span-2">{$t('resources.type')}</div>
			<div class="col-span-3">{$t('resources.location')}</div>
			<div class="col-span-2">{$t('resources.capacity')}</div>
			<div class="col-span-1 text-right">{$t('resources.status')}</div>
		</div>
		<ul>
			{#each filteredResources as r (r.id)}
				<li
					class="grid grid-cols-12 items-center gap-4 border-b border-border px-5 py-3.5 last:border-b-0 hover:bg-secondary"
				>
					<div class="col-span-4 text-sm font-medium">{r.name}</div>
					<div class="col-span-2">
						<span
							class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
						>
							{$t(`resourceType.${r.type}`)}
						</span>
					</div>
					<div class="col-span-3 text-sm text-foreground/70">{r.location}</div>
					<div class="col-span-2 font-mono text-xs">
						{r.capacity ? $t('resources.pax', { n: r.capacity }) : '—'}
					</div>
					<div class="col-span-1 flex justify-end">
						<span
							class={cn(
								'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
								RESOURCE_STATUS_TONE[r.status],
							)}
						>
							{$t(`resourceStatus.${r.status}`)}
						</span>
					</div>
				</li>
			{/each}
		</ul>
	</div>
</div>

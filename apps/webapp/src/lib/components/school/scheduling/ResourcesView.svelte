<script lang="ts">
	import type { Resource } from '$lib/types/school';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterPanel from '$lib/components/ui/FilterPanel.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { readResourceListFilters, writeResourceListFilters } from '$lib/list/list-url-filters';
	import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
	import { appGoto } from '$lib/navigation/app-navigation';
	import { RESOURCE_STATUS_TONE } from '$lib/ui-tones';
	import { cn } from '$lib/utils';

	const statusKeys = ['all', 'available', 'booked', 'maintenance'] as const;

	const initialFilters = $derived(readResourceListFilters($page.url));

	const listFilters = new ListFiltersState<{ q: string; status: string }>(
		{
			getUrl: () => $page.url,
			write: writeResourceListFilters,
			goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
		},
		() => readResourceListFilters($page.url),
	);

	const filteredResources = $derived(
		detailDataContext.resources.filter((resource: Resource) => {
			if (listFilters.values.status !== 'all' && resource.status !== listFilters.values.status) {
				return false;
			}
			const needle = listFilters.values.q.trim().toLowerCase();
			if (!needle) {
				return true;
			}
			return resource.name.toLowerCase().includes(needle)
				|| resource.location.toLowerCase().includes(needle)
				|| resource.type.toLowerCase().includes(needle);
		}),
	);

	const statusFilterActive = $derived(listFilters.values.status !== 'all' ? 1 : 0);

	const statusFilterOptions = $derived(
		statusKeys.map(key => ({
			value: key,
			label: key === 'all' ? $t('filter.all') : $t(`resourceStatus.${key}`),
		})),
	);

	$effect(() => {
		const next = initialFilters;
		listFilters.hydrate({
			q: next.q,
			status: statusKeys.includes(next.status as (typeof statusKeys)[number])
				? next.status
				: 'all',
		});
	});

	$effect(() => {
		if (!listFilters.ready) {
			return;
		}
		void listFilters.values.status;
		listFilters.scheduleSync();
	});
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('resources.eyebrow')}
		title={$t('resources.count', { n: filteredResources.length })}
	>
		{#snippet search()}
			<ListSearchField
				bind:value={listFilters.values.q}
				oninput={() => listFilters.scheduleSync()}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterPanel activeCount={statusFilterActive} title={$t('resources.status')}>
				<FilterSelect
					bind:value={listFilters.values.status}
					class="h-9 w-full rounded-md text-xs"
					options={statusFilterOptions}
				/>
			</FilterPanel>
		{/snippet}
		{#snippet primary()}
			<Button size="sm" class="rounded-full">
				<Plus class="mr-1 h-4 w-4" />
				{$t('resources.newResource')}
			</Button>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
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
			{#each filteredResources as resource (resource.id)}
				<li
					class="grid grid-cols-12 items-center gap-4 border-b border-border px-5 py-4 text-sm last:border-b-0"
				>
					<div class="col-span-4 font-medium">{resource.name}</div>
					<div class="col-span-2 text-foreground/80">{resource.type}</div>
					<div class="col-span-3 text-foreground/80">{resource.location}</div>
					<div class="col-span-2 font-mono text-xs text-muted-foreground">
						{$t('resources.pax', { n: resource.capacity })}
					</div>
					<div class="col-span-1 flex justify-end">
						<span
							class={cn(
								'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
								RESOURCE_STATUS_TONE[resource.status],
							)}
						>
							{$t(`resourceStatus.${resource.status}`)}
						</span>
					</div>
				</li>
			{:else}
				<li class="px-5 py-12 text-center text-sm text-muted-foreground">
					{$t('dataState.emptyDescription')}
				</li>
			{/each}
		</ul>
	</div>
</div>

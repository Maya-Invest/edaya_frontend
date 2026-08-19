<script lang="ts">
	import type { GradeLevel } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { sortGradeLevels } from '$lib/academic/grade-level-sort';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Layers, Plus } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { cn } from '$lib/utils';
	import { getGradeLevelsPageState } from '../grade-levels-page.svelte';
	import GradeLevelFormModal from './GradeLevelFormModal.svelte';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (gradeLevel: GradeLevel) => void;
		selectedId?: string;
	} = $props();

	const gradeLevelsPage = getGradeLevelsPageState();

	const modals = createUrlSyncedModals({ allowed: ['create'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const createOpen = bindUrlModal(modals, 'create');

	const cycleOptions = $derived([
		{ value: 'all', label: $t('gradeLevels.allCycles') },
		...[...new Set(academicContext.gradeLevels.map(level => level.cycle).filter(Boolean))]
			.map(value => ({ value, label: value })),
	]);

	const filteredLevels = $derived(
		sortGradeLevels(academicContext.gradeLevels)
			.filter((level) => {
				if (
					gradeLevelsPage.filters.values.cycle !== 'all'
					&& level.cycle !== gradeLevelsPage.filters.values.cycle
				) {
					return false;
				}
				const needle = gradeLevelsPage.filters.values.q.trim().toLowerCase();
				if (!needle) {
					return true;
				}
				return level.name.toLowerCase().includes(needle)
					|| level.cycle.toLowerCase().includes(needle);
			}),
	);

	const grouped = $derived.by(() => {
		const groups: Record<string, GradeLevel[]> = {};
		for (const level of filteredLevels) {
			const key = level.cycle || $t('gradeLevels.subtitle');
			const bucket = groups[key] ?? [];
			bucket.push(level);
			groups[key] = bucket;
		}
		return Object.entries(groups);
	});
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('gradeLevels.subtitle')}
		title={$t('gradeLevels.title', { n: filteredLevels.length })}
	>
		{#snippet search()}
			<ListSearchField
				value={gradeLevelsPage.filters.values.q}
				oninput={event => gradeLevelsPage.filters.setField('q', event.currentTarget.value)}
			/>
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				value={gradeLevelsPage.filters.values.cycle}
				onchange={value => gradeLevelsPage.filters.patchImmediate({ cycle: value })}
				class="h-9 w-44 rounded-full text-xs"
				options={cycleOptions}
			/>
		{/snippet}
		{#snippet primary()}
			<PermissionGate permission="SCHOOL_STRUCTURE_CONFIGURE" mode="disable">
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						class="rounded-full"
						{disabled}
						{title}
						onclick={() => modals.open('create')}
					>
						<Plus class="mr-1 h-4 w-4" />
						{$t('gradeLevels.add')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/snippet}
		{#snippet more()}
			<ListMoreMenu exportOnly />
		{/snippet}
	</ListPageHeader>

	<div class="space-y-6">
		{#each grouped as [groupLabel, levels] (groupLabel)}
			<section>
				<h3 class="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
					<Layers class="h-4 w-4 text-muted-foreground" />
					{groupLabel}
				</h3>
				<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
					<table class="w-full text-sm">
						<thead class="border-b border-border bg-secondary/30 text-left">
							<tr>
								<th class="px-4 py-3 font-medium">{$t('gradeLevels.name')}</th>
								<th class="px-4 py-3 font-medium">{$t('gradeLevels.label')}</th>
								<th class="px-4 py-3 font-medium">{$t('gradeLevels.order')}</th>
								<th class="px-4 py-3 font-medium">{$t('gradeLevels.classCount')}</th>
							</tr>
						</thead>
						<tbody>
							{#each levels as level (level.id)}
								{@const isSelected = level.id === selectedId}
								<tr class="border-b border-border/60 last:border-0">
									<td class="px-4 py-3">
										<button
											type="button"
											class={cn(
												'w-full text-left transition-colors',
												isSelected && 'text-primary',
											)}
											onclick={() => onSelect?.(level)}
										>
											<p class="font-medium">{level.name}</p>
											<p class="font-mono text-[10px] text-muted-foreground">{level.id}</p>
										</button>
									</td>
									<td class="px-4 py-3 text-muted-foreground">{level.label}</td>
									<td class="px-4 py-3 font-mono text-muted-foreground">{level.order}</td>
									<td class="px-4 py-3 font-mono">{gradeLevelsPage.classCountFor(level.id)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/each}
	</div>
</div>

<GradeLevelFormModal bind:open={createOpen.open} />

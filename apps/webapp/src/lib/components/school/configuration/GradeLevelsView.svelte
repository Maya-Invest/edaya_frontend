<script lang="ts">
	import type { GradeLevel } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import GradeLevelFormModal from '$lib/components/school/configuration/GradeLevelFormModal.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import ListMoreMenu from '$lib/components/ui/ListMoreMenu.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Layers, Plus } from '$lib/icons';
	import { cn } from '$lib/utils';

	const {
		onSelect,
		selectedId,
	}: {
		onSelect?: (gradeLevel: GradeLevel) => void;
		selectedId?: string;
	} = $props();

	let q = $state('');
	let cycle = $state('all');
	let createOpen = $state(false);

	const cycleOptions = $derived([
		{ value: 'all', label: $t('gradeLevels.allCycles') },
		...[...new Set(academicContext.gradeLevels.map(level => level.cycle).filter(Boolean))]
			.map(value => ({ value, label: value })),
	]);

	const filteredLevels = $derived(
		[...academicContext.gradeLevels]
			.sort((a, b) => a.order - b.order)
			.filter((level) => {
				if (cycle !== 'all' && level.cycle !== cycle) {
					return false;
				}
				const needle = q.trim().toLowerCase();
				if (!needle) {
					return true;
				}
				return level.name.toLowerCase().includes(needle)
					|| level.cycle.toLowerCase().includes(needle);
			}),
	);

	const grouped = $derived.by(() => {
		const groups = new Map<string, GradeLevel[]>();
		for (const level of filteredLevels) {
			const key = level.cycle || $t('gradeLevels.subtitle');
			const bucket = groups.get(key) ?? [];
			bucket.push(level);
			groups.set(key, bucket);
		}
		return [...groups.entries()];
	});

	function classCountFor(levelId: string): number {
		return academicContext.classes.filter(entry => entry.gradeLevelId === levelId).length;
	}
</script>

<div class="animate-fade-in">
	<ListPageHeader
		eyebrow={$t('gradeLevels.subtitle')}
		title={$t('gradeLevels.title', { n: filteredLevels.length })}
	>
		{#snippet search()}
			<ListSearchField bind:value={q} />
		{/snippet}
		{#snippet filters()}
			<FilterSelect
				bind:value={cycle}
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
						onclick={() => (createOpen = true)}
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
									<td class="px-4 py-3 font-mono text-muted-foreground">{level.order}</td>
									<td class="px-4 py-3 font-mono">{classCountFor(level.id)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/each}
	</div>
</div>

<GradeLevelFormModal bind:open={createOpen} />

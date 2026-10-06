<script lang="ts">
	import type { ClassNode, GradeLevel } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import { t } from '$lib/i18n';
	import { timetableClassGroups } from '../timetable-planning';

	let { classes, gradeLevels, selectedIds = $bindable<string[]>([]), disabled = false }: {
		classes: ClassNode[];
		gradeLevels: GradeLevel[];
		selectedIds?: string[];
		disabled?: boolean;
	} = $props();
	let search = $state('');
	const groups = $derived(timetableClassGroups(classes, gradeLevels, search));
	const selected = $derived(new Set(selectedIds));

	function toggle(id: string, checked: boolean) {
		if (disabled)
			return;
		selectedIds = checked ? [...new Set([...selectedIds, id])] : selectedIds.filter(value => value !== id);
	}
</script>

<section aria-label={$t('timetable.classesToGenerate')} class="space-y-2 rounded-xl border border-border/70 p-3" data-testid="timetable-class-selection">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<p class="text-sm font-medium">{$t('timetable.classesToGenerate')} <span class="font-normal text-muted-foreground">{$t('timetable.selectedClassCount', { selected: selectedIds.length, total: classes.length })}</span></p>
		<div class="flex flex-wrap gap-1">
			<Button type="button" variant="ghost" size="sm" {disabled} onclick={() => { selectedIds = classes.map(row => row.id); }} data-testid="timetable-select-all">{$t('timetable.selectAllClasses')}</Button>
			<Button type="button" variant="ghost" size="sm" {disabled} onclick={() => { selectedIds = []; }} data-testid="timetable-clear-selection">{$t('timetable.clearClassSelection')}</Button>
		</div>
	</div>
	<ListSearchField bind:value={search} placeholder={$t('timetable.searchClasses')} />
	<div class="max-h-36 space-y-2 overflow-y-auto" data-testid="timetable-class-options">
		{#each groups as group (group.id)}
			<fieldset class="space-y-1">
				<legend class="text-xs font-medium text-muted-foreground">{group.label}</legend>
				<div class="grid grid-cols-2 gap-x-3 sm:grid-cols-3">
					{#each group.classes as row (row.id)}
						<label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
							<Checkbox checked={selected.has(row.id)} onCheckedChange={checked => toggle(row.id, checked)} {disabled} data-testid="timetable-class-checkbox" data-class-id={row.id} />
							<span>{row.name}</span>
						</label>
					{/each}
				</div>
			</fieldset>
		{:else}
			<p class="text-sm text-muted-foreground">{$t('picker.noResults')}</p>
		{/each}
	</div>
	{#if !selectedIds.length}
		<p class="text-sm text-muted-foreground" role="status">{$t('timetable.selectAtLeastOneClass')}</p>
	{/if}
</section>

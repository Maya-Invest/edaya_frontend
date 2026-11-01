<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import ListSearchField from '$lib/components/ui/ListSearchField.svelte';
	import { t } from '$lib/i18n';
	import { Check } from '$lib/icons';
	import { cn } from '$lib/utils';
	import { ClassGroupPickerState } from './class-group-picker-state.svelte';

	let {
		value = $bindable(''),
		values = $bindable<string[]>([]),
		mode = 'single',
		excludeIds = [],
		showLevelFilter = true,
		disabled = false,
		placeholder,
		variant = 'panel',
		class: className,
		onValueChange,
	}: {
		value?: string;
		values?: string[];
		mode?: 'single' | 'multi';
		excludeIds?: string[];
		showLevelFilter?: boolean;
		disabled?: boolean;
		placeholder?: string;
		variant?: 'panel' | 'embedded';
		active?: boolean;
		class?: string;
		onValueChange?: (next: string) => void;
	} = $props();

	const pickerState = new ClassGroupPickerState();
	let levelFilter = $state('all');

	const levelFilterOptions = $derived([
		{ value: 'all', label: $t('filter.all') },
		...Array.from(new Set(academicContext.classes.map(entry => entry.level)))
			.sort((a, b) => a.localeCompare(b, 'fr'))
			.map(level => ({ value: level, label: level })),
	]);

	const showFilters = $derived(showLevelFilter && levelFilterOptions.length > 2);
	const filtered = $derived(pickerState.filteredClasses(excludeIds, levelFilter));
	const selected = $derived(mode === 'single' ? pickerState.classById(value) : undefined);

	function isSelected(classGroupId: string): boolean {
		return mode === 'multi' ? values.includes(classGroupId) : value === classGroupId;
	}

	function toggleSelection(classGroupId: string) {
		if (mode === 'multi') {
			values = values.includes(classGroupId)
				? values.filter(id => id !== classGroupId)
				: [...values, classGroupId];
			return;
		}
		value = classGroupId;
		onValueChange?.(classGroupId);
	}

	function removeChip(classGroupId: string) {
		values = values.filter(id => id !== classGroupId);
	}

	function classInitials(name: string): string {
		return name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map(part => part[0]?.toUpperCase() ?? '')
			.join('');
	}
</script>

<div class={cn('space-y-3', className)}>
	{#if mode === 'multi' && values.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each values as classGroupId (classGroupId)}
				{@const classGroup = pickerState.classById(classGroupId)}
				<button
					type="button"
					class="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs"
					onclick={() => removeChip(classGroupId)}
					{disabled}
				>
					<span>{classGroup?.name ?? classGroupId}</span>
					<span class="text-muted-foreground">×</span>
				</button>
			{/each}
		</div>
	{/if}

	<div
		class={cn(
			'flex flex-col overflow-hidden rounded-collection border border-border',
			variant === 'panel' ? 'h-[min(55vh,28rem)]' : 'max-h-64',
		)}
	>
		<div class="space-y-2 border-b border-border p-3">
			{#if showFilters}
				<FilterSelect
					bind:value={levelFilter}
					options={levelFilterOptions}
					class="h-9 w-full"
				/>
			{/if}
			<div class="relative">
				<ListSearchField
					bind:value={pickerState.search}
					placeholder={placeholder ?? $t('activities.searchClass')}

					{disabled}
				/>
			</div>
		</div>
		<div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
			{#if filtered.length === 0}
				<p class="px-4 py-8 text-center text-sm text-muted-foreground">
					{$t('picker.noResults')}
				</p>
			{:else}
				<ul class="divide-y divide-border/50" role="listbox">
					{#each filtered as classGroup (classGroup.id)}
						{@const activeItem = isSelected(classGroup.id)}
						<li>
							<button
								type="button"
								disabled={disabled}
								role="option"
								aria-selected={activeItem}
								onclick={() => toggleSelection(classGroup.id)}
								class={cn(
									'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-50',
									activeItem && 'bg-primary/10',
								)}
							>
								<span
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-[10px] font-semibold"
								>
									{classInitials(classGroup.name)}
								</span>
								<span class="min-w-0 flex-1">
									<span class="block truncate font-medium">{classGroup.name}</span>
									<span class="block truncate text-xs text-muted-foreground">
										{classGroup.level} · {classGroup.studentCount} {$t('activities.studentsShort')}
									</span>
								</span>
								{#if activeItem}
									<Check class="h-4 w-4 shrink-0 text-primary" />
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		{#if mode === 'single' && selected}
			<div class="border-t border-border px-4 py-2 text-xs text-muted-foreground">
				{$t('picker.selected')}: <span class="font-medium text-foreground">{selected.name}</span>
			</div>
		{:else if mode === 'multi' && values.length > 0}
			<div class="border-t border-border px-4 py-2 text-xs text-muted-foreground">
				{$t('picker.selectedCount', { n: values.length })}
			</div>
		{/if}
	</div>
</div>

<script lang="ts">
	import type { PersonPickerItem } from '$lib/smart-components/person-picker/person-picker-types';
	import { academicContext } from '$lib/academic/context.svelte';
	import PersonAvatar from '$lib/components/school/shared/PersonAvatar.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { Check, LoaderCircle, Search } from '$lib/icons';
	import { filterPersonPickerItems } from '$lib/smart-components/person-picker/filter-person-picker-items';
	import PersonPicker from '$lib/smart-components/person-picker/PersonPicker.svelte';
	import { cn } from '$lib/utils';
	import { StudentPickerState } from './student-picker-state.svelte';

	let {
		value = $bindable(''),
		values = $bindable<string[]>([]),
		mode = 'single',
		excludeIds = [],
		classGroupId = '',
		classGroupIds,
		showClassFilter = true,
		disabled = false,
		placeholder,
		variant = 'popover',
		active = false,
		class: className,
		onValueChange,
	}: {
		value?: string;
		values?: string[];
		mode?: 'single' | 'multi';
		excludeIds?: string[];
		classGroupId?: string;
		/** When set, only students from these class groups appear. An empty array shows a link-classes hint. */
		classGroupIds?: readonly string[];
		showClassFilter?: boolean;
		disabled?: boolean;
		placeholder?: string;
		variant?: 'popover' | 'panel';
		active?: boolean;
		class?: string;
		onValueChange?: (next: string) => void;
	} = $props();

	const pickerState = new StudentPickerState();
	let classFilter = $state('all');
	let query = $state('');

	$effect(() => {
		if (active || variant === 'panel') {
			void pickerState.ensureLoaded();
		}
	});

	const restrictedClassIds = $derived.by(() => {
		if (classGroupId) {
			return new Set([classGroupId]);
		}
		if (classGroupIds !== undefined) {
			return new Set(classGroupIds);
		}
		return null;
	});

	const requiresLinkedClasses = $derived(classGroupIds !== undefined && classGroupIds.length === 0);

	const selectableClasses = $derived(
		academicContext.classes
			.filter(entry => !restrictedClassIds || restrictedClassIds.has(entry.id))
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name, 'fr')),
	);

	$effect(() => {
		if (classFilter !== 'all' && restrictedClassIds && !restrictedClassIds.has(classFilter)) {
			classFilter = 'all';
		}
	});

	const classNameById = $derived(new Map(academicContext.classes.map(entry => [entry.id, entry.name])));

	const availableStudents = $derived(
		pickerState.students
			.filter(student => !excludeIds.includes(student.id))
			.filter(student => !restrictedClassIds || restrictedClassIds.has(student.classId))
			.filter(student => classFilter === 'all' || student.classId === classFilter)
			.sort((a, b) => a.name.localeCompare(b.name, 'fr')),
	);

	const items = $derived.by((): PersonPickerItem[] =>
		availableStudents.map((student) => {
			const className = classNameById.get(student.classId);
			return {
				id: student.id,
				name: student.name,
				initials: student.initials,
				photoUrl: student.photoUrl,
				subtitle: className ?? student.classId,
				searchText: [student.email, className, student.classId].filter(Boolean).join(' '),
			};
		}),
	);

	const filtered = $derived(filterPersonPickerItems(items, query));
	const selected = $derived(items.find(entry => entry.id === value));

	const classFilterOptions = $derived([
		{ value: 'all', label: $t('common.allClasses') },
		...selectableClasses.map(entry => ({ value: entry.id, label: entry.name })),
	]);

	const showFilters = $derived(showClassFilter && selectableClasses.length > 1 && !classGroupId);

	function isSelected(studentId: string): boolean {
		return mode === 'multi' ? values.includes(studentId) : value === studentId;
	}

	function toggleSelection(studentId: string) {
		if (mode === 'multi') {
			values = values.includes(studentId)
				? values.filter(id => id !== studentId)
				: [...values, studentId];
			return;
		}
		value = studentId;
		onValueChange?.(studentId);
	}

	function removeChip(studentId: string) {
		values = values.filter(id => id !== studentId);
	}
</script>

{#if variant === 'popover' && mode === 'single'}
	<PersonPicker
		bind:value
		{items}
		{disabled}
		class={className}
		placeholder={placeholder ?? $t('events.selectStudent')}
		searchPlaceholder={$t('common.searchStudent')}
		onValueChange={onValueChange}
	>
		{#snippet filters()}
			{#if showFilters}
				<FilterSelect
					bind:value={classFilter}
					options={classFilterOptions}
					class="h-9 w-full"
				/>
			{/if}
		{/snippet}
	</PersonPicker>
{:else}
	<div class={cn('space-y-3', className)}>
		{#if mode === 'multi' && values.length > 0}
			<div class="flex flex-wrap gap-2">
				{#each values as studentId (studentId)}
					{@const student = pickerState.students.find(entry => entry.id === studentId)}
					<button
						type="button"
						class="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs"
						onclick={() => removeChip(studentId)}
						{disabled}
					>
						<span>{student?.name ?? studentId}</span>
						<span class="text-muted-foreground">×</span>
					</button>
				{/each}
			</div>
		{/if}

		<div class={cn('flex h-[min(55vh,28rem)] flex-col overflow-hidden rounded-xl border border-border')}>
			<div class="space-y-2 border-b border-border p-3">
				{#if showFilters}
					<FilterSelect
						bind:value={classFilter}
						options={classFilterOptions}
						class="h-9 w-full"
					/>
				{/if}
				<div class="relative">
					<Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input
						bind:value={query}
						placeholder={placeholder ?? $t('activities.searchStudent')}
						class="h-9 rounded-full pl-8 text-sm"
						{disabled}
					/>
				</div>
			</div>
			<div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
				{#if pickerState.loading}
					<div class="flex items-center justify-center py-10" role="status">
						<LoaderCircle class="h-5 w-5 animate-spin text-primary" />
					</div>
				{:else if requiresLinkedClasses}
					<p class="px-4 py-8 text-center text-sm text-muted-foreground">
						{$t('activities.studentPickerNoLinkedClasses')}
					</p>
				{:else if items.length === 0}
					<p class="px-4 py-8 text-center text-sm text-muted-foreground">
						{$t('picker.noOptions')}
					</p>
				{:else if filtered.length === 0}
					<p class="px-4 py-8 text-center text-sm text-muted-foreground">
						{$t('picker.noResults')}
					</p>
				{:else}
					<ul class="divide-y divide-border/50" role="listbox">
						{#each filtered as item (item.id)}
							{@const activeItem = isSelected(item.id)}
							<li>
								<button
									type="button"
									disabled={disabled || item.disabled}
									role="option"
									aria-selected={activeItem}
									onclick={() => toggleSelection(item.id)}
									class={cn(
										'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-50',
										activeItem && 'bg-primary/10',
									)}
								>
									<PersonAvatar
										name={item.name}
										initials={item.initials}
										photoUrl={item.photoUrl}
										size="list"
									/>
									<span class="min-w-0 flex-1">
										<span class="block truncate font-medium">{item.name}</span>
										{#if item.subtitle}
											<span class="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
										{/if}
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
{/if}

<script lang="ts">
	import type { ClassNode, Student } from '$lib/types/school';
	import type { PersonPickerItem } from './person-picker-types';
	import { academicContext } from '$lib/academic/context.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import { t } from '$lib/i18n';
	import { studentPickerSearchText, studentPickerSubtitle } from '$lib/students/format-student-picker-subtitle';
	import PersonPicker from './PersonPicker.svelte';

	let {
		value = $bindable(''),
		students,
		classes: classesProp,
		excludeIds = [],
		showClassFilter = true,
		disabled = false,
		placeholder,
		class: className,
		onValueChange,
	}: {
		value?: string;
		students: Student[];
		classes?: ClassNode[];
		excludeIds?: string[];
		showClassFilter?: boolean;
		disabled?: boolean;
		placeholder?: string;
		class?: string;
		onValueChange?: (next: string) => void;
	} = $props();

	let classFilter = $state('all');

	const resolvedClasses = $derived(classesProp ?? academicContext.classes);
	const classNameById = $derived(new Map(resolvedClasses.map(entry => [entry.id, entry.name])));

	const availableStudents = $derived(
		students
			.filter(student => !excludeIds.includes(student.id))
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
				subtitle: studentPickerSubtitle({
					classLabel: className,
					classId: student.classId,
					matricule: student.matricule,
				}),
				searchText: studentPickerSearchText({
					email: student.email,
					classLabel: className,
					classId: student.classId,
					matricule: student.matricule,
				}),
			};
		}),
	);

	const classFilterOptions = $derived([
		{ value: 'all', label: $t('common.allClasses') },
		...resolvedClasses
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
			.map(entry => ({ value: entry.id, label: entry.name })),
	]);

	const showFilters = $derived(showClassFilter && resolvedClasses.length > 1);
</script>

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

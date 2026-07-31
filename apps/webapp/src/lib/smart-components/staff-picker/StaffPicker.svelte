<script lang="ts">
	import type { PersonPickerItem } from '$lib/smart-components/person-picker/person-picker-types';
	import type { StaffMember } from '$lib/types/school';
	import { t } from '$lib/i18n';
	import PersonPicker from '$lib/smart-components/person-picker/PersonPicker.svelte';
	import { StaffPickerState } from './staff-picker-state.svelte';

	let {
		value = $bindable(''),
		staff: staffOverride,
		activeOnly = true,
		excludeIds = [],
		disabled = false,
		active = false,
		placeholder,
		class: className,
		onValueChange,
	}: {
		value?: string;
		staff?: StaffMember[];
		activeOnly?: boolean;
		excludeIds?: string[];
		disabled?: boolean;
		active?: boolean;
		placeholder?: string;
		class?: string;
		onValueChange?: (next: string) => void;
	} = $props();

	const pickerState = new StaffPickerState();

	$effect(() => {
		if (active && !staffOverride) {
			void pickerState.ensureLoaded();
		}
	});

	const resolvedStaff = $derived(staffOverride ?? pickerState.staff);

	const items = $derived.by((): PersonPickerItem[] =>
		resolvedStaff
			.filter(member => !activeOnly || member.isActive)
			.filter(member => !excludeIds.includes(member.id))
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
			.map((member) => {
				const roleLabel = $t(`staff.role.${member.role}`);
				return {
					id: member.id,
					name: member.name,
					initials: member.initials,
					photoUrl: member.photoUrl,
					subtitle: member.department ? `${roleLabel} · ${member.department}` : roleLabel,
					searchText: [member.email, member.department, roleLabel].filter(Boolean).join(' '),
				};
			}),
	);
</script>

<PersonPicker
	bind:value
	{items}
	{disabled}
	class={className}
	placeholder={placeholder ?? $t('picker.selectStaff')}
	searchPlaceholder={$t('picker.searchStaff')}
	onValueChange={onValueChange}
/>

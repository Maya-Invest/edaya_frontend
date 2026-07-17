<script lang="ts">
	import type { StaffMember } from '$lib/types/school';
	import type { PersonPickerItem } from './person-picker-types';
	import { t } from '$lib/i18n';
	import PersonPicker from './PersonPicker.svelte';

	let {
		value = $bindable(''),
		staff,
		activeOnly = true,
		excludeIds = [],
		disabled = false,
		placeholder,
		class: className,
		onValueChange,
	}: {
		value?: string;
		staff: StaffMember[];
		activeOnly?: boolean;
		excludeIds?: string[];
		disabled?: boolean;
		placeholder?: string;
		class?: string;
		onValueChange?: (next: string) => void;
	} = $props();

	const items = $derived.by((): PersonPickerItem[] =>
		staff
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

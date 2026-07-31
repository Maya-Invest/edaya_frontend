<script lang="ts">
	import type { PersonPickerItem } from '$lib/smart-components/person-picker/person-picker-types';
	import type { Guardian } from '$lib/types/school';
	import { relationKey } from '$lib/components/school/shared/drawer-constants';
	import { t } from '$lib/i18n';
	import PersonPicker from '$lib/smart-components/person-picker/PersonPicker.svelte';
	import { GuardianPickerState } from './guardian-picker-state.svelte';

	let {
		value = $bindable(''),
		guardians: guardiansOverride,
		excludeIds = [],
		disabled = false,
		active = false,
		placeholder,
		class: className,
		onValueChange,
	}: {
		value?: string;
		guardians?: Guardian[];
		excludeIds?: string[];
		disabled?: boolean;
		active?: boolean;
		placeholder?: string;
		class?: string;
		onValueChange?: (next: string) => void;
	} = $props();

	const pickerState = new GuardianPickerState();

	$effect(() => {
		if (active && !guardiansOverride) {
			void pickerState.ensureLoaded();
		}
	});

	const resolvedGuardians = $derived(guardiansOverride ?? pickerState.guardians);

	const items = $derived.by((): PersonPickerItem[] =>
		resolvedGuardians
			.filter(guardian => !excludeIds.includes(guardian.id))
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
			.map((guardian) => {
				const contact = guardian.email || guardian.phone;
				const relKey = relationKey[guardian.relation];
				const relationLabel = relKey ? $t(relKey) : guardian.relation;
				return {
					id: guardian.id,
					name: guardian.name,
					initials: guardian.initials,
					photoUrl: guardian.photoUrl,
					subtitle: contact,
					hint: relationLabel,
					searchText: [guardian.email, guardian.phone, relationLabel].join(' '),
				};
			}),
	);
</script>

<PersonPicker
	bind:value
	{items}
	{disabled}
	class={className}
	placeholder={placeholder ?? $t('guardian.selectGuardian')}
	searchPlaceholder={$t('picker.searchGuardian')}
	onValueChange={onValueChange}
/>

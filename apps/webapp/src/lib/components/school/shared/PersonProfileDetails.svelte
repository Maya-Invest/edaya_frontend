<script lang="ts">
	import type { PersonKind } from '$lib/people-profile-fields';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import { t } from '$lib/i18n';
	import { PERSON_PROFILE_FIELDS, personFieldDraft } from '$lib/people-profile-fields';

	const { kind, person, exclude = [] }: {
		kind: PersonKind;
		person: object;
		exclude?: readonly string[];
	} = $props();
	const values = $derived(personFieldDraft(kind, person));
</script>
<div class="ui-person-facts grid gap-4 sm:grid-cols-2">
	{#each PERSON_PROFILE_FIELDS[kind].filter(field => !exclude.includes(field.key)) as field (field.key)}<DrawerField label={$t(field.labelKey)}><p class="whitespace-pre-wrap break-words text-sm">{values[field.key] || $t('profile.notProvided')}</p></DrawerField>{/each}
</div>

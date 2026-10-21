<script lang="ts">
	import type { PersonKind } from '$lib/people-profile-fields';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { PERSON_PROFILE_FIELDS } from '$lib/people-profile-fields';

	let { kind, values = $bindable({}), exclude = [] }: {
		kind: PersonKind;
		values?: Record<string, string>;
		exclude?: string[];
	} = $props();
</script>
<div class="grid gap-3 sm:grid-cols-2">
	{#each PERSON_PROFILE_FIELDS[kind].filter(field => !exclude.includes(field.key)) as field (field.key)}
		<Label class="block space-y-1.5"><span>{$t(field.labelKey)}</span><Input type={field.type ?? 'text'} value={values[field.key] ?? ''} oninput={event => values[field.key] = event.currentTarget.value} /></Label>
	{/each}
</div>

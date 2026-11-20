<script lang="ts">
	import type { PersonKind } from '$lib/people-profile-fields';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { PERSON_PROFILE_FIELDS } from '$lib/people-profile-fields';
	import IdentifierCorrection from '$lib/smart-components/human-identifier/IdentifierCorrection.svelte';

	let { kind, values = $bindable({}), exclude = [], entityId }: {
		kind: PersonKind;
		values?: Record<string, string>;
		exclude?: string[];
		entityId?: string;
	} = $props();
</script>
<div class="grid gap-3 sm:grid-cols-2">
	{#each PERSON_PROFILE_FIELDS[kind].filter(field => !exclude.includes(field.key)) as field (field.key)}
		<Label class="block space-y-1.5"><span>{$t(field.labelKey)}</span><Input readonly={field.key === 'identifier'} type={field.type ?? 'text'} value={values[field.key] ?? ''} oninput={event => values[field.key] = event.currentTarget.value} /></Label>
		{#if field.key === 'identifier' && entityId}<IdentifierCorrection {kind} {entityId} identifier={values.identifier ?? ''} onCorrected={value => values.identifier = value} />{/if}
	{/each}
</div>

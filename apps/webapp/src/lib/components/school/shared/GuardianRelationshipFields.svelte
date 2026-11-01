<script lang="ts">
	import type { GuardianRelationshipFields } from '$lib/smart-components/guardian-relationship/guardian-relationship-state.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { guardianRelationshipDraft } from '$lib/smart-components/guardian-relationship/guardian-relationship-state.svelte';

	let { fields = $bindable(guardianRelationshipDraft()) }: {
		fields?: GuardianRelationshipFields;
	} = $props();
	const flags = ['isPrimary', 'isBillingContact', 'legalGuardian', 'canPickup', 'receivesAcademicReports', 'receivesAttendanceAlerts'] as const;
</script>
<Label class="block space-y-2"><span>{$t('profile.relationship')}</span><Input value={fields.relationship ?? ''} oninput={event => fields.relationship = event.currentTarget.value} /></Label>
<div class="grid gap-3 sm:grid-cols-2">{#each flags as field (field)}<Label class="flex items-center gap-2"><Checkbox checked={fields[field] ?? false} onCheckedChange={value => fields[field] = value === true} />{$t(`profile.${field}`)}</Label>{/each}</div>
<Label class="block space-y-2"><span>{$t('profile.emergencyPriority')}</span><Input type="number" min="1" step="1" value={String(fields.emergencyContactPriority ?? '')} oninput={event => fields.emergencyContactPriority = event.currentTarget.value ? Number(event.currentTarget.value) : null} /></Label>
<Label class="block space-y-2"><span>{$t('profile.contactRestrictions')}</span><Textarea value={fields.contactRestrictions ?? ''} oninput={event => fields.contactRestrictions = event.currentTarget.value || null} /></Label>
<Label class="block space-y-2"><span>{$t('profile.notes')}</span><Textarea value={fields.notes ?? ''} oninput={event => fields.notes = event.currentTarget.value || null} /></Label>

<script lang="ts">
	import type { GuardianContactDraft } from '$lib/guardians/contact-fields';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';

	let { contacts = $bindable(), disabled = false }: { contacts: GuardianContactDraft; disabled?: boolean } = $props();
	const uid = $props.id();
</script>
<fieldset class="space-y-4" {disabled}>
	<legend class="mb-2 text-sm font-semibold">{$t('profile.contactMethods')}</legend>
	<div class="grid gap-3 sm:grid-cols-2">
		{#each (['phone', 'alternativePhone', 'email'] as const) as field (field)}
			<div class="space-y-1.5">
				<Label for={`${uid}-${field}`}>{$t(`guardian.contacts.${field}`)}</Label>
				<Input id={`${uid}-${field}`} type={field === 'email' ? 'email' : 'tel'} bind:value={contacts[field]} {disabled} />
			</div>
		{/each}
	</div>
	<p class="text-xs text-muted-foreground">{$t('guardian.contacts.deliveryHint')}</p>
	<div class="space-y-3">
		{#each (['email', 'sms', 'push'] as const) as channel (channel)}
			<Label class="flex items-center gap-2" for={`${uid}-${channel}-enabled`}>
				<Checkbox id={`${uid}-${channel}-enabled`} bind:checked={contacts[`${channel}NotificationsEnabled`]} {disabled} />
				{$t(`account.notifications.${channel}`)}
			</Label>
		{/each}
	</div>
</fieldset>

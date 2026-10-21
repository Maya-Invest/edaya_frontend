<script lang="ts">
	import type { components } from '$lib/api/schema';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';

	let { methods = $bindable([]) }: {
		methods?: components['schemas']['Guardian']['contactMethods'];
	} = $props();
	const types = ['phone', 'email', 'whatsapp', 'sms', 'other'] as const;
	function makePrimary(index: number) {
		methods = methods.map((method, i) => ({ ...method, isPrimary: i === index }));
	}
</script>
<fieldset class="space-y-3"><legend class="mb-2 text-sm font-semibold">{$t('profile.contactMethods')}</legend>
	{#each methods as method, index (index)}
		<div class="space-y-3 rounded-xl border border-border p-3">
			<div class="grid gap-3 sm:grid-cols-2">
				<Label class="space-y-1"><span>{$t('profile.contactType')}</span><select class="h-10 w-full rounded-xl border border-border bg-card px-3" bind:value={method.type}>{#each types as type (type)}<option value={type}>{$t(`profile.contact.${type}`)}</option>{/each}</select></Label>
				<Label class="space-y-1"><span>{$t('profile.contactValue')}</span><Input bind:value={method.value} type={method.type === 'email' ? 'email' : 'text'} /></Label>
				<Label class="space-y-1"><span>{$t('profile.contactLabel')}</span><Input value={method.label ?? ''} oninput={event => method.label = event.currentTarget.value || null} /></Label>
			</div>
			<div class="flex flex-wrap items-center gap-3"><Label class="flex items-center gap-2"><Checkbox checked={method.isPrimary} onCheckedChange={(checked) => {
				if (checked)
					makePrimary(index);
				else
					method.isPrimary = false;
			}} />{$t('profile.primaryContact')}</Label><Label class="flex items-center gap-2"><Checkbox checked={method.allowsNotifications} onCheckedChange={checked => method.allowsNotifications = checked === true} />{$t('profile.allowsNotifications')}</Label><Button variant="ghost" size="sm" onclick={() => methods = methods.filter((_, i) => i !== index)}>{$t('common.delete')}</Button></div>
		</div>
	{/each}
	<Button variant="outline" size="sm" onclick={() => methods = [...methods, { type: 'phone', value: '', label: null, isPrimary: methods.length === 0, allowsNotifications: true }]}>{$t('common.add')}</Button>
</fieldset>

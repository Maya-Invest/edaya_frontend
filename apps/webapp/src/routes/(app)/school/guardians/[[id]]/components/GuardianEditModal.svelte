<script lang="ts">
	import type { Guardian } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getGuardiansPageState } from '../../guardians-page.svelte';

	let {
		guardian,
		disabled = false,
		title,
		open = $bindable(false),
		showTrigger = true,
	}: {
		guardian: Guardian;
		disabled?: boolean;
		title?: string;
		open?: boolean;
		showTrigger?: boolean;
	} = $props();

	const guardiansPage = getGuardiansPageState();

	let busy = $state(false);
	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');

	function resetForm() {
		const parts = guardian.name.trim().split(/\s+/);
		firstName = parts.shift() ?? '';
		lastName = parts.join(' ');
		email = guardian.email;
		phone = guardian.phone;
	}

	$effect(() => {
		resetForm();
	});

	const canSubmit = $derived(firstName.trim().length > 0 && lastName.trim().length > 0);

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		const fullName = `${firstName.trim()} ${lastName.trim()}`;
		const ok = await guardiansPage.updateContact({
			guardianId: guardian.id,
			firstName,
			lastName,
			email,
			phone,
			successMessage: get(t)('guardian.updateSuccess', { name: fullName }),
		});
		busy = false;
		if (ok) {
			open = false;
		}
	}
</script>

{#if showTrigger}
	<Button variant="outline" size="sm" class="rounded-full" {disabled} {title} onclick={() => (open = true)}>
		{$t('guardian.editContact')}
	</Button>
{/if}

<FormModal
	bind:open
	title={$t('guardian.editTitle', { name: guardian.name })}
	description={$t('guardian.editDescription')}
	submitLabel={$t('common.save')}
	{busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.firstName')}
			</Label>
			<Input bind:value={firstName} />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.lastName')}
			</Label>
			<Input bind:value={lastName} />
		</div>
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.email')}
			</Label>
			<Input type="email" bind:value={email} />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.phone')}
			</Label>
			<Input bind:value={phone} />
		</div>
	</div>
</FormModal>

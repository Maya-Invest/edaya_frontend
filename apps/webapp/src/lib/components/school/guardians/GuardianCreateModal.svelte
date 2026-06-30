<script lang="ts">
	import { registerGuardianMutation } from '$lib/api/mutations/people.mutations';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	let {
		open = $bindable(false),
		onCreated,
	}: {
		open?: boolean;
		onCreated?: (guardianId: string) => void;
	} = $props();

	let busy = $state(false);
	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');
	let sendAccountInvitation = $state(true);

	function resetForm() {
		firstName = '';
		lastName = '';
		email = '';
		phone = '';
		sendAccountInvitation = true;
	}

	const canSubmit = $derived(firstName.trim().length > 0 && lastName.trim().length > 0);

	async function submit() {
		if (!canSubmit)
			return;

		busy = true;
		const fullName = `${firstName.trim()} ${lastName.trim()}`;
		const guardianId = await registerGuardianMutation({
			firstName,
			lastName,
			email,
			phone,
			sendAccountInvitation,
			successMessage: get(t)('guardian.createSuccess', { name: fullName }),
		});
		busy = false;
		if (guardianId) {
			open = false;
			resetForm();
			onCreated?.(guardianId);
		}
	}
</script>

<FormModal
	bind:open
	title={$t('guardian.createTitle')}
	description={$t('guardian.createDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.firstName')}
			</Label>
			<Input bind:value={firstName} autocomplete="given-name" />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.lastName')}
			</Label>
			<Input bind:value={lastName} autocomplete="family-name" />
		</div>
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.email')}
			</Label>
			<Input type="email" bind:value={email} autocomplete="email" />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('common.phone')}
			</Label>
			<Input type="tel" bind:value={phone} autocomplete="tel" />
		</div>
	</div>
	<div class="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
		<Checkbox bind:checked={sendAccountInvitation} id="guardian-send-invite" />
		<div class="space-y-1">
			<Label for="guardian-send-invite" class="text-sm font-medium">
				{$t('invitation.createModal.sendInvite')}
			</Label>
			<p class="text-xs text-muted-foreground">{$t('invitation.createModal.sendInviteHint')}</p>
		</div>
	</div>
</FormModal>

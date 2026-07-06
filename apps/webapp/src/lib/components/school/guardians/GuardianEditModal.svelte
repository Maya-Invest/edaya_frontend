<script lang="ts">
	import type { Guardian } from '$lib/types/school';
	import { updateGuardianContactMutation } from '$lib/api/mutations/people.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';

	let {
		g,
		disabled = false,
		title,
		open = $bindable(false),
		showTrigger = true,
	}: {
		g: Guardian;
		disabled?: boolean;
		title?: string;
		open?: boolean;
		showTrigger?: boolean;
	} = $props();
	let busy = $state(false);
	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');

	function resetForm() {
		const parts = g.name.trim().split(/\s+/);
		firstName = parts.shift() ?? '';
		lastName = parts.join(' ');
		email = g.email;
		phone = g.phone;
	}

	$effect(() => {
		resetForm();
	});

	const canSubmit = $derived(firstName.trim().length > 0 && lastName.trim().length > 0);

	async function submit() {
		if (!canSubmit)
			return;

		busy = true;
		const ok = await updateGuardianContactMutation({
			guardianId: g.id,
			firstName,
			lastName,
			email,
			phone,
			successMessage: `Tuteur ${firstName.trim()} ${lastName.trim()} mis à jour.`,
		});
		busy = false;
		if (ok) {
			open = false;
		}
	}
</script>

{#if showTrigger}
	<Button variant="outline" size="sm" class="rounded-full" {disabled} {title} onclick={() => (open = true)}>
		Modifier le contact
	</Button>
{/if}

<FormModal
	bind:open
	title={`Modifier ${g.name}`}
	description="Les liens avec les élèves se gèrent depuis les actions dédiées."
	submitLabel="Enregistrer"
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Prénom</Label>
			<Input bind:value={firstName} />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Nom</Label>
			<Input bind:value={lastName} />
		</div>
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Email</Label>
			<Input type="email" bind:value={email} />
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Téléphone</Label>
			<Input bind:value={phone} />
		</div>
	</div>
</FormModal>

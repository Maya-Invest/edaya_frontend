<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { linkGuardianToStudentMutation } from '$lib/api/mutations/student.mutations';
	import GuardianPicker from '$lib/components/school/shared/pickers/GuardianPicker.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PickerModal from '$lib/components/ui/PickerModal.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';

	let {
		s,
		disabled = false,
		title,
		open = $bindable(false),
		showTrigger = true,
	}: {
		s: Student;
		disabled?: boolean;
		title?: string;
		open?: boolean;
		showTrigger?: boolean;
	} = $props();
	let busy = $state(false);
	let guardianId = $state('');

	const available = $derived(detailDataContext.guardians.filter(g => !g.studentIds.includes(s.id)));
	const selectedGuardian = $derived(available.find(g => g.id === guardianId));

	let wasOpen = $state(false);

	function resetPicker() {
		guardianId = available[0]?.id ?? '';
	}

	$effect(() => {
		if (open && !wasOpen)
			resetPicker();
		wasOpen = open;
	});

	async function confirm() {
		if (!guardianId)
			return;

		busy = true;
		const ok = await linkGuardianToStudentMutation({
			guardianId,
			studentId: s.id,
			successMessage: `${selectedGuardian?.name ?? 'Le tuteur'} a été rattaché à ${s.name}.`,
		});
		busy = false;
		if (ok) {
			open = false;
			guardianId = '';
		}
	}
</script>

{#if showTrigger}
	<Button
		variant="ghost"
		class="w-full rounded-full border border-dashed border-border"
		{disabled}
		{title}
		onclick={() => (open = true)}
	>
		Rattacher un tuteur
	</Button>
{/if}

<PickerModal
	bind:open
	title={`Rattacher un tuteur à ${s.name}`}
	description="Choisissez un tuteur existant à associer au dossier de l’élève."
	confirmLabel="Rattacher"
	busy={busy}
	confirmDisabled={!guardianId || available.length === 0}
	onCancel={resetPicker}
	onConfirm={confirm}
>
	{#if available.length === 0}
		<p class="rounded-xl bg-secondary/40 p-3 text-sm text-muted-foreground">
			Tous les tuteurs connus sont déjà rattachés à cet élève.
		</p>
	{:else}
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tuteur</Label>
			<GuardianPicker bind:value={guardianId} guardians={available} />
		</div>
	{/if}
</PickerModal>

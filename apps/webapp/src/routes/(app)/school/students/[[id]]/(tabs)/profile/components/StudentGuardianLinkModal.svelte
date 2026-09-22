<script lang="ts">
	import type { Student } from '$lib/types/school';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PickerModal from '$lib/components/ui/PickerModal.svelte';
	import GuardianPicker from '$lib/smart-components/guardian-picker/GuardianPicker.svelte';
	import { getStudentProfileTabState } from '../student-profile-tab.svelte';

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

	const profileTab = getStudentProfileTabState();
	let busy = $state(false);
	let guardianId = $state('');
	const linkedIds = $derived(profileTab.linkedGuardians(s.id).map(guardian => guardian.id));

	let wasOpen = $state(false);

	function resetPicker() {
		guardianId = '';
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
		const ok = await profileTab.linkGuardian({
			guardianId,
			studentId: s.id,
			successMessage: `Le tuteur a été rattaché à ${s.name}.`,
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
	confirmDisabled={!guardianId}
	onCancel={resetPicker}
	onConfirm={confirm}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tuteur</Label>
		<GuardianPicker bind:value={guardianId} excludeIds={linkedIds} active={open} />
	</div>
</PickerModal>

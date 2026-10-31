<script lang="ts">
	import type { Student } from '$lib/types/school';
	import GuardianRelationshipFields from '$lib/components/school/shared/GuardianRelationshipFields.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PickerModal from '$lib/components/ui/PickerModal.svelte';
	import { t } from '$lib/i18n';
	import GuardianPicker from '$lib/smart-components/guardian-picker/GuardianPicker.svelte';
	import { guardianRelationshipDraft } from '$lib/smart-components/guardian-relationship/guardian-relationship-state.svelte';
	import { get } from 'svelte/store';
	import { getStudentProfileTabState } from '../student-profile-tab.svelte';

	let { s, disabled = false, title, open = $bindable(false), showTrigger = true }: {
		s: Student;
		disabled?: boolean;
		title?: string;
		open?: boolean;
		showTrigger?: boolean;
	} = $props();
	const profileTab = getStudentProfileTabState();
	let busy = $state(false);
	let guardianId = $state('');
	let relationshipFields = $state(guardianRelationshipDraft());
	const linkedIds = $derived(profileTab.linkedGuardians(s.id).map(guardian => guardian.id));
	let wasOpen = $state(false);
	function resetPicker() {
		guardianId = '';
		relationshipFields = guardianRelationshipDraft();
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
			relationshipFields,
			studentId: s.id,
			successMessage: get(t)('student.profile.guardianLinked', { name: s.name }),
		});
		busy = false;
		if (ok) {
			open = false;
			guardianId = '';
			relationshipFields = guardianRelationshipDraft();
		}
	}
</script>

{#if showTrigger}
	<Button
		variant="ghost"
		class="w-full border border-dashed border-border"
		{disabled}
		{title}
		onclick={() => (open = true)}
	>
		{$t('student.linkGuardian')}
	</Button>
{/if}

<PickerModal
	bind:open
	title={$t('student.profile.guardianTitle', { name: s.name })}
	description={$t('student.profile.guardianDescription')}
	confirmLabel={$t('student.linkGuardian')}
	busy={busy}
	confirmDisabled={!guardianId || !relationshipFields.relationship?.trim()}
	onCancel={resetPicker}
	onConfirm={confirm}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{$t('people.guardians')}</Label>
		<GuardianPicker bind:value={guardianId} excludeIds={linkedIds} active={open} />
	</div>
	<GuardianRelationshipFields bind:fields={relationshipFields} />
</PickerModal>

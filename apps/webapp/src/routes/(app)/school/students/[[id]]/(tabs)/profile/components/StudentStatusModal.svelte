<script lang="ts">
	import type { Student } from '$lib/types/school';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
	import { getStudentProfileTabState } from '../student-profile-tab.svelte';

	const { s, open, onClose }: { s: Student; open: boolean; onClose: () => void } = $props();
	const owner = getStudentProfileTabState();
	let status = $state('');
	let busy = $state(false);
	let opened = $state('');
	const identity = $derived(`${s.id}:${s.status}`);
	$effect(() => {
		if (open && opened !== identity) {
			status = s.status;
			opened = identity;
		}
		if (!open)
			opened = '';
	});
	const allowed = $derived(hasPermission('STUDENT_MANAGE', { classId: s.classId, studentId: s.id }));
	async function save() {
		if (!allowed || !['active', 'inactive', 'archived'].includes(status) || status === s.status || busy)
			return;
		busy = true;
		try {
			if (await owner.updateStatus(s.id, status as 'active' | 'inactive' | 'archived'))
				onClose();
		}
		finally {
			busy = false;
		}
	}
</script>
<FormModal {open} onOpenChange={(value) => {
	if (!value)
		onClose();
}} title={$t('student.profile.changeStatus')} submitLabel={$t('common.save')} {busy} submitDisabled={!allowed || status === s.status || !['active', 'inactive', 'archived'].includes(status)} onSubmit={save}>
	<Label for="student-status">{$t('students.status')}</Label><SelectField id="student-status" bind:value={status}>{#if s.status === 'graduated'}<option value="graduated" disabled>{$t('studentStatus.graduated')}</option>{/if}{#each ['active', 'inactive', 'archived'] as value (value)}<option {value}>{$t(`studentStatus.${value}`)}</option>{/each}</SelectField>
</FormModal>

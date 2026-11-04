<script lang="ts">
	import type { ModalUrlBind } from '$lib/modal/modal-state.svelte';
	import type { Student } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import StudentAvatar from '$lib/components/school/shared/StudentAvatar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { getDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { hasPermission } from '$lib/permissions';
	import StudentProfileEditModal from '../(tabs)/profile/components/StudentProfileEditModal.svelte';
	import StudentStatusModal from '../(tabs)/profile/components/StudentStatusModal.svelte';
	import ChangeClassButton from './ChangeClassButton.svelte';

	const {
		student,
		editProfileOpen,
		changeClassOpen,
	}: {
		student: Student;
		editProfileOpen: ModalUrlBind<string>;
		changeClassOpen: ModalUrlBind<string>;
	} = $props();

	const modals = getDrawerUrlModals();
	const canManage = $derived(hasPermission('STUDENT_MANAGE', { classId: student.classId, studentId: student.id }));
	const studentClass = $derived(academicContext.classes.find(cl => cl.id === student.classId));
</script>

{#snippet statusActions()}<Button variant="ghost" onclick={() => modals?.open('change-status')}>{$t('student.profile.changeStatus')}</Button>{/snippet}
<div class="ui-student-identity">
	<DrawerEntityHeader
		name={student.name} overflow={canManage ? statusActions : undefined}
	>
		{#snippet avatar()}
			<StudentAvatar s={student} />
		{/snippet}

		{#snippet facts()}<div class="flex flex-wrap items-center gap-2">
			{#if studentClass}
				<span class="text-sm text-muted-foreground">
					{studentClass.name}
				</span>
			{/if}
			<span class="text-sm text-muted-foreground">{academicContext.year?.label ?? $t('academic.selectYear')}</span>
			<span class="rounded bg-secondary px-2 py-1 text-xs font-medium">{$t(`studentStatus.${student.status}`)}</span>
		</div><div class="flex flex-wrap gap-x-4 gap-y-2 text-sm"><span><span class="text-xs text-muted-foreground">{$t('profile.matricule')}:</span> {student.matricule || $t('profile.notProvided')}</span><span><span class="text-xs text-muted-foreground">{$t('profile.nationalMatricule')}:</span> {student.nationalMatricule || $t('profile.notProvided')}</span></div>{/snippet}

		{#snippet actions()}
			<PermissionGate permission="STUDENT_MANAGE" classId={student.classId} studentId={student.id} mode="hide" tooltip={$t('student.permissionUpdate')}>
				{#snippet children({ disabled, title })}
					<StudentProfileEditModal s={student} {disabled} {title} bind:open={editProfileOpen.open} />
				{/snippet}
			</PermissionGate>
			{#if hasPermission('ENROLLMENT_MANAGE', { classId: student.classId, studentId: student.id })}<ChangeClassButton s={student} bind:open={changeClassOpen.open} />{/if}
		{/snippet}
	</DrawerEntityHeader>
</div>

<StudentStatusModal s={student} open={modals?.active === 'change-status' && canManage} onClose={() => modals?.close()} />

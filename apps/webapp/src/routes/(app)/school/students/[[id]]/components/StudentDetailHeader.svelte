<script lang="ts">
	import type { ModalUrlBind } from '$lib/modal/modal-state.svelte';
	import type { Student } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import StudentAvatar from '$lib/components/school/shared/StudentAvatar.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import StudentProfileEditModal from '../(tabs)/profile/components/StudentProfileEditModal.svelte';
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

	const studentClass = $derived(academicContext.classes.find(cl => cl.id === student.classId));
</script>

<DrawerEntityHeader
	name={student.name}
	summary={$t('drawer.studentSummary', {
		avg: student.average.toFixed(2),
		att: student.attendance ?? '—',
	})}
>
	{#snippet avatar()}
		<StudentAvatar s={student} />
	{/snippet}
	{#snippet chips()}
		{#if studentClass}
			<span class="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/80">
				{studentClass.name}
			</span>
		{/if}
	{/snippet}
	{#snippet actions()}
		<PermissionGate permission="STUDENT_MANAGE" mode="disable" tooltip={$t('student.permissionUpdate')}>
			{#snippet children({ disabled, title })}
				<StudentProfileEditModal s={student} {disabled} {title} bind:open={editProfileOpen.open} />
			{/snippet}
		</PermissionGate>
		<ChangeClassButton s={student} bind:open={changeClassOpen.open} />
	{/snippet}
</DrawerEntityHeader>

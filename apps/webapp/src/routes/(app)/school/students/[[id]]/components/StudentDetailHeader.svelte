<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import ProfilePhotoPicker from '$lib/components/school/shared/ProfilePhotoPicker.svelte';
	import StudentAvatar from '$lib/components/school/shared/StudentAvatar.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import { get } from 'svelte/store';
	import type { ModalUrlBind } from '$lib/modal/modal-state.svelte';
	import StudentProfileEditModal from '../(tabs)/profile/components/StudentProfileEditModal.svelte';
	import { getStudentProfileTabState } from '../(tabs)/profile/student-profile-tab.svelte';
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

	const profileTab = getStudentProfileTabState();
	const studentClass = $derived(academicContext.classes.find(cl => cl.id === student.classId));
	const canChangePhoto = $derived(canUploadProfilePhoto('STUDENT_UPDATE'));

	async function handlePhotoChange(file: File) {
		return profileTab.updateProfilePhoto({
			studentId: student.id,
			file,
			successMessage: get(t)('profilePhoto.updateSuccess'),
		});
	}
</script>

<DrawerEntityHeader
	name={student.name}
	summary={$t('drawer.studentSummary', {
		avg: student.average.toFixed(1),
		att: student.attendance ?? '—',
	})}
>
	{#snippet avatar()}
		{#if canChangePhoto}
			<ProfilePhotoPicker
				name={student.name}
				initials={student.initials}
				photoUrl={student.photoUrl}
				size="list"
				onChange={handlePhotoChange}
			/>
		{:else}
			<StudentAvatar s={student} />
		{/if}
	{/snippet}
	{#snippet chips()}
		{#if studentClass}
			<span class="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/80">
				{studentClass.name}
			</span>
		{/if}
	{/snippet}
	{#snippet actions()}
		<PermissionGate permission="STUDENT_UPDATE" mode="disable" tooltip={$t('student.permissionUpdate')}>
			{#snippet children({ disabled, title })}
				<StudentProfileEditModal s={student} {disabled} {title} bind:open={editProfileOpen.open} />
			{/snippet}
		</PermissionGate>
		<ChangeClassButton s={student} bind:open={changeClassOpen.open} />
	{/snippet}
</DrawerEntityHeader>

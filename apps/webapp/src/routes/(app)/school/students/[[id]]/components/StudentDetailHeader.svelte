<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import ProfilePhotoPicker from '$lib/components/school/shared/ProfilePhotoPicker.svelte';
	import StudentAvatar from '$lib/components/school/shared/StudentAvatar.svelte';
	import StudentGradeEntryModal from '$lib/components/school/students/StudentGradeEntryModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import { get } from 'svelte/store';
	import StudentAbsenceModal from '../(tabs)/attendance/components/StudentAbsenceModal.svelte';
	import StudentIncidentModal from '../(tabs)/incidents/components/StudentIncidentModal.svelte';
	import StudentGuardianLinkModal from '../(tabs)/profile/components/StudentGuardianLinkModal.svelte';
	import StudentNoteModal from '../(tabs)/profile/components/StudentNoteModal.svelte';
	import StudentProfileEditModal from '../(tabs)/profile/components/StudentProfileEditModal.svelte';
	import { getStudentProfileTabState } from '../(tabs)/profile/student-profile-tab.svelte';
	import ChangeClassButton from './ChangeClassButton.svelte';

	type StudentDrawerModal
		= | 'edit-profile'
			| 'change-class'
			| 'link-guardian'
			| 'note'
			| 'add-absence'
			| 'add-incident'
			| 'add-grade';

	const { student }: { student: Student } = $props();

	const profileTab = getStudentProfileTabState();
	const studentClass = $derived(academicContext.classes.find(cl => cl.id === student.classId));
	const canChangePhoto = $derived(canUploadProfilePhoto('STUDENT_UPDATE'));

	const modals = createUrlSyncedModals<StudentDrawerModal>({
		allowed: [
			'edit-profile',
			'change-class',
			'link-guardian',
			'note',
			'add-absence',
			'add-incident',
			'add-grade',
		],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editProfileOpen = bindUrlModal(modals, 'edit-profile');
	const changeClassOpen = bindUrlModal(modals, 'change-class');
	const linkGuardianOpen = bindUrlModal(modals, 'link-guardian');
	const noteOpen = bindUrlModal(modals, 'note');
	const addAbsenceOpen = bindUrlModal(modals, 'add-absence');
	const addIncidentOpen = bindUrlModal(modals, 'add-incident');
	const addGradeOpen = bindUrlModal(modals, 'add-grade');

	const editingNote = $derived(
		modals.target
			? profileTab.notesFor(student.id).find(note => note.id === modals.target)
			: undefined,
	);

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

<StudentGuardianLinkModal s={student} bind:open={linkGuardianOpen.open} showTrigger={false} />
<StudentNoteModal s={student} note={editingNote} bind:open={noteOpen.open} showTrigger={false} />
<StudentAbsenceModal s={student} bind:open={addAbsenceOpen.open} showTrigger={false} />
<StudentIncidentModal s={student} bind:open={addIncidentOpen.open} showTrigger={false} />
<StudentGradeEntryModal s={student} bind:open={addGradeOpen.open} showTrigger={false} />

<script lang="ts">
	import type { Student } from '$lib/types/school';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { kindStyle, kindLabelKey } from '$lib/components/school/shared/drawer-constants';
	import StudentDrawerBody from '$lib/components/school/shared/StudentDrawerBody.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import DrawerFrame from '$lib/components/ui/DrawerFrame.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle, X } from '$lib/icons';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasPermission } from '$lib/permissions';
	import { get } from 'svelte/store';
	import StudentAbsenceModal from '../(tabs)/attendance/components/StudentAbsenceModal.svelte';
	import StudentIncidentModal from '../(tabs)/incidents/components/StudentIncidentModal.svelte';
	import StudentGuardianLinkModal from '../(tabs)/profile/components/StudentGuardianLinkModal.svelte';
	import StudentNoteModal from '../(tabs)/profile/components/StudentNoteModal.svelte';
	import StudentPhotoRejectModal from '../(tabs)/profile/components/StudentPhotoRejectModal.svelte';
	import { getStudentProfileTabState } from '../(tabs)/profile/student-profile-tab.svelte';
	import { shouldCloseStudentHealthModal } from '../../lib/student-modal-surface';
	import { getStudentsPageState } from '../../students-page.svelte';
	import StudentDetailHeader from './StudentDetailHeader.svelte';
	import StudentDetailTabBar from './StudentDetailTabBar.svelte';

	type StudentDrawerModal = 'change-status' | 'edit-profile' | 'edit-annual-profile' | 'remove-annual-profile' | 'guardian-relationship' | 'enrollment-progression' | 'edit-health' | 'change-class' | 'link-guardian' | 'note' | 'edit-note' | 'add-absence' | 'add-incident' | 'approve-photo' | 'reject-photo';
	const { student, loading = false, onClose, children }: {
		student?: Student;
		loading?: boolean;
		onClose: () => void;
		children: Snippet;
	} = $props();
	const profileTab = getStudentProfileTabState();
	const studentsPage = getStudentsPageState();
	const modals = createUrlSyncedModals<StudentDrawerModal>({
		allowed: [
			'change-status',
			'edit-profile',
			'edit-annual-profile',
			'remove-annual-profile',
			'guardian-relationship',
			'enrollment-progression',
			'edit-health',
			'change-class',
			'link-guardian',
			'note',
			'edit-note',
			'add-absence',
			'add-incident',
			'approve-photo',
			'reject-photo',
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
	const editNoteOpen = bindUrlModal(modals, 'edit-note');
	const addAbsenceOpen = bindUrlModal(modals, 'add-absence');
	const addIncidentOpen = bindUrlModal(modals, 'add-incident');
	const approvePhotoOpen = bindUrlModal(modals, 'approve-photo');
	const rejectPhotoOpen = bindUrlModal(modals, 'reject-photo');
	const editingNote = $derived(student && modals.active === 'edit-note' && modals.target
		? profileTab.notesFor(student.id).find(note => note.id === modals.target)
		: undefined);
	const canUpdateHealth = $derived(hasPermission('STUDENT_HEALTH_UPDATE', { classId: student?.classId, studentId: student?.id }) && hasPermission('STUDENT_HEALTH_READ', { classId: student?.classId, studentId: student?.id }));
	const pendingPhoto = $derived(student ? studentsPage.pendingPhotoFor(student.id) : undefined);
	let photoReviewBusy = $state(false);
	const closeHealthModal = $derived(shouldCloseStudentHealthModal(modals.active, $page.route.id, canUpdateHealth));
	$effect(() => {
		if (!modals.ready || !student) {
			return;
		}
		const scope = { classId: student.classId, studentId: student.id };
		const action = modals.active;
		if ((['change-status', 'edit-profile', 'note', 'edit-note'].includes(action ?? '') && !hasPermission('STUDENT_MANAGE', scope)) || (action === 'change-class' && !hasPermission('ENROLLMENT_MANAGE', scope)) || (action === 'link-guardian' && !hasPermission('PARENT_MANAGE', scope))) {
			modals.close();
			return;
		}
		if (closeHealthModal) {
			modals.close();
			return;
		}
		if ((modals.active === 'approve-photo' || modals.active === 'reject-photo') && (!pendingPhoto || !hasPermission('STUDENT_MANAGE', { studentId: student.id, classId: student.classId }))) {
			modals.close();
			return;
		}
		if (modals.active === 'note' && modals.target) {
			modals.close();
			return;
		}
		if (modals.active !== 'edit-note') {
			return;
		}
		if (!modals.target) {
			modals.close();
			return;
		}
		const notesLoaded = profileTab.statusFor('notes', student.id)?.status === 'ready';
		const onProfileRoute = $page.route.id?.endsWith('/(tabs)/profile') ?? false;
		if ((!notesLoaded && !onProfileRoute) || (notesLoaded && !editingNote)) {
			modals.close();
		}
	});
	async function approvePendingPhoto() {
		if (!student || photoReviewBusy) {
			return;
		}
		photoReviewBusy = true;
		try {
			const ok = await profileTab.approvePendingPhoto({
				studentId: student.id,
				successMessage: get(t)('student.photo.approvedToast'),
			});
			if (ok) {
				approvePhotoOpen.open = false;
			}
		}
		finally {
			photoReviewBusy = false;
		}
	}
	async function rejectPendingPhoto(reason: string) {
		if (!student || photoReviewBusy) {
			return;
		}
		photoReviewBusy = true;
		try {
			const ok = await profileTab.rejectPendingPhoto({
				studentId: student.id,
				rejectionReason: reason,
				successMessage: get(t)('student.photo.rejectedToast'),
			});
			if (ok) {
				rejectPhotoOpen.open = false;
			}
		}
		finally {
			photoReviewBusy = false;
		}
	}
</script>

<DrawerFrame {onClose} label={$t(kindLabelKey.student)}>
	<header class="flex items-center justify-between border-b border-border px-6 py-4">
		<span
			class="rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider {kindStyle.student}"
		>
			{$t(kindLabelKey.student)}
		</span>
		<Button variant="ghost" size="icon" onclick={onClose} aria-label={$t('common.close')}><X class="h-4 w-4" /></Button>
	</header>

	<div class="min-h-0 flex-1 flex flex-col">
		{#if loading || !student}
			<div class="flex min-h-[12rem] items-center justify-center" role="status" aria-live="polite">
				<LoaderCircle class="h-6 w-6 animate-spin text-primary" />
			</div>
		{:else}
			<StudentDrawerBody>
				{#snippet context()}<StudentDetailHeader {student} editProfileOpen={editProfileOpen} changeClassOpen={changeClassOpen} /><StudentDetailTabBar {student} />{/snippet}
				{@render children()}
			</StudentDrawerBody>
			<StudentGuardianLinkModal s={student} bind:open={linkGuardianOpen.open} showTrigger={false} />
			<StudentNoteModal s={student} bind:open={noteOpen.open} showTrigger={false} />
			{#if editingNote}
				<StudentNoteModal
					s={student}
					note={editingNote}
					bind:open={editNoteOpen.open}
					showTrigger={false}
				/>
			{/if}
			<StudentAbsenceModal s={student} bind:open={addAbsenceOpen.open} showTrigger={false} />
			<StudentIncidentModal s={student} bind:open={addIncidentOpen.open} showTrigger={false} />
			<ConfirmModal
				bind:open={approvePhotoOpen.open}
				title={$t('student.photo.approveTitle')}
				description={$t('student.photo.approveDescription')}
				confirmLabel={$t('student.photo.approve')}
				cancelLabel={$t('common.cancel')}
				variant="default"
				busy={photoReviewBusy}
				onConfirm={() => void approvePendingPhoto()}
			/>
			<StudentPhotoRejectModal
				bind:open={rejectPhotoOpen.open}
				busy={photoReviewBusy}
				onConfirm={reason => void rejectPendingPhoto(reason)}
			/>
		{/if}
	</div>

</DrawerFrame>

<script lang="ts">
	import type { Student } from '$lib/types/school';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { kindStyle, kindLabelKey } from '$lib/components/school/shared/drawer-constants';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
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

	type StudentDrawerModal = 'edit-profile' | 'edit-annual-profile' | 'remove-annual-profile' | 'guardian-relationship' | 'enrollment-progression' | 'edit-health' | 'change-class' | 'link-guardian' | 'note' | 'edit-note' | 'add-absence' | 'add-incident' | 'approve-photo' | 'reject-photo';
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
	const canUpdateHealth = $derived(hasPermission('STUDENT_HEALTH_UPDATE'));
	const pendingPhoto = $derived(student ? studentsPage.pendingPhotoFor(student.id) : undefined);
	let photoReviewBusy = $state(false);
	const closeHealthModal = $derived(shouldCloseStudentHealthModal(modals.active, $page.route.id, canUpdateHealth));
	$effect(() => {
		if (!modals.ready || !student) {
			return;
		}
		if (closeHealthModal) {
			modals.close();
			return;
		}
		if ((modals.active === 'approve-photo' || modals.active === 'reject-photo') && !pendingPhoto) {
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
		const profileLoaded = profileTab.slice?.studentId === student.id;
		const onProfileRoute = $page.route.id?.endsWith('/(tabs)/profile') ?? false;
		if ((!profileLoaded && !onProfileRoute) || (profileLoaded && !editingNote)) {
			modals.close();
		}
	});
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}
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

<svelte:window onkeydown={handleKeydown} />

<div
	role="presentation"
	onclick={onClose}
	class="fixed inset-0 z-40 bg-primary/5 motion-safe:animate-fade-in"
></div>
<aside
	class="fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-hidden border-l border-border bg-card shadow-panel motion-safe:animate-slide-in-right md:w-1/2"
	aria-label={$t(kindLabelKey.student)}
>
	<header class="flex items-center justify-between border-b border-border px-6 py-4">
		<span
			class="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider {kindStyle.student}"
		>
			{$t(kindLabelKey.student)}
		</span>
		<button
			type="button"
			onclick={onClose}
			class="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
		>
			<X class="h-4 w-4" />
		</button>
	</header>

	<div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 py-6">
		{#if loading || !student}
			<div class="flex min-h-[12rem] items-center justify-center" role="status" aria-live="polite">
				<LoaderCircle class="h-6 w-6 animate-spin text-primary" />
			</div>
		{:else}
			<div class="space-y-5">
				<StudentDetailHeader
					{student}
					editProfileOpen={editProfileOpen}
					changeClassOpen={changeClassOpen}
				/>
				<StudentDetailTabBar {student} />
				{@render children()}
			</div>
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

</aside>

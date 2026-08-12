<script lang="ts">
	import type { Student } from '$lib/types/school';
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { kindStyle, kindLabelKey } from '$lib/components/school/shared/drawer-constants';
	import StudentGradeEntryModal from '$lib/components/school/students/StudentGradeEntryModal.svelte';
	import { t } from '$lib/i18n';
	import { LoaderCircle, X } from '$lib/icons';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import StudentAbsenceModal from '../(tabs)/attendance/components/StudentAbsenceModal.svelte';
	import StudentIncidentModal from '../(tabs)/incidents/components/StudentIncidentModal.svelte';
	import StudentGuardianLinkModal from '../(tabs)/profile/components/StudentGuardianLinkModal.svelte';
	import StudentNoteModal from '../(tabs)/profile/components/StudentNoteModal.svelte';
	import { getStudentProfileTabState } from '../(tabs)/profile/student-profile-tab.svelte';
	import StudentDetailHeader from './StudentDetailHeader.svelte';
	import StudentDetailTabBar from './StudentDetailTabBar.svelte';

	type StudentDrawerModal
		= | 'edit-profile'
			| 'change-class'
			| 'link-guardian'
			| 'note'
			| 'add-absence'
			| 'add-incident'
			| 'add-grade';

	const {
		student,
		loading = false,
		onClose,
		children,
	}: {
		student?: Student;
		loading?: boolean;
		onClose: () => void;
		children: Snippet;
	} = $props();

	const profileTab = getStudentProfileTabState();

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
		student && modals.target
			? profileTab.notesFor(student.id).find(note => note.id === modals.target)
			: undefined,
	);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
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
			<StudentNoteModal s={student} note={editingNote} bind:open={noteOpen.open} showTrigger={false} />
			<StudentAbsenceModal s={student} bind:open={addAbsenceOpen.open} showTrigger={false} />
			<StudentIncidentModal s={student} bind:open={addIncidentOpen.open} showTrigger={false} />
			<StudentGradeEntryModal s={student} bind:open={addGradeOpen.open} showTrigger={false} />
		{/if}
	</div>

</aside>

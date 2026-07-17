<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { updateStudentProfilePhotoMutation } from '$lib/api/mutations/profile-photo.mutations';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import DrawerTabBar from '$lib/components/ui/DrawerTabBar.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { createUrlSyncedDrawerTabs } from '$lib/drawer/drawer-tabs-state.svelte';
	import { t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import { get } from 'svelte/store';
	import ProfilePhotoPicker from '../shared/ProfilePhotoPicker.svelte';
	import StudentAvatar from '../shared/StudentAvatar.svelte';
	import ChangeClassButton from './ChangeClassButton.svelte';
	import {
		buildStudentGradeSummaryFromRows,
		sortPedagogicalNotes,
		summarizeStudentAttendanceHistory,
		summarizeStudentFinances,
		summarizeStudentIncidents,
	} from './student-tab-selectors.ts';
	import StudentAbsenceModal from './StudentAbsenceModal.svelte';
	import StudentAttendanceTab from './StudentAttendanceTab.svelte';
	import StudentEnrollmentsTab from './StudentEnrollmentsTab.svelte';
	import StudentFinanceTab from './StudentFinanceTab.svelte';
	import StudentGradeEntryModal from './StudentGradeEntryModal.svelte';
	import StudentGradesTab from './StudentGradesTab.svelte';
	import StudentGuardianLinkModal from './StudentGuardianLinkModal.svelte';
	import StudentIncidentModal from './StudentIncidentModal.svelte';
	import StudentIncidentsTab from './StudentIncidentsTab.svelte';
	import StudentNoteModal from './StudentNoteModal.svelte';
	import StudentProfileEditModal from './StudentProfileEditModal.svelte';
	import StudentProfileTab from './StudentProfileTab.svelte';
	import StudentReportCardPanel from './StudentReportCardPanel.svelte';

	type StudentDrawerModal
		= | 'edit-profile'
			| 'change-class'
			| 'link-guardian'
			| 'note'
			| 'add-grade'
			| 'add-absence'
			| 'add-incident';

	const { s }: { s: Student } = $props();

	type StudentTab
		= | 'profile'
			| 'grades'
			| 'attendance'
			| 'incidents'
			| 'finances'
			| 'reportCard'
			| 'enrollments';

	const STUDENT_TABS: StudentTab[] = [
		'profile',
		'grades',
		'attendance',
		'incidents',
		'finances',
		'reportCard',
		'enrollments',
	];

	const tabs = createUrlSyncedDrawerTabs<StudentTab>({
		allowed: STUDENT_TABS,
		defaultTab: 'profile',
		getUrl: () => $page.url,
	});

	$effect(() => {
		tabs.hydrate();
	});

	const modals = createUrlSyncedModals<StudentDrawerModal>({
		allowed: [
			'edit-profile',
			'change-class',
			'link-guardian',
			'note',
			'add-grade',
			'add-absence',
			'add-incident',
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
	const addGradeOpen = bindUrlModal(modals, 'add-grade');
	const addAbsenceOpen = bindUrlModal(modals, 'add-absence');
	const addIncidentOpen = bindUrlModal(modals, 'add-incident');

	const drawerData = $derived(detailDataContext.studentDrawerDataFor(s.id));
	const linkedGuardians = $derived(detailDataContext.guardians.filter(g => g.studentIds.includes(s.id)));
	const health = $derived(detailDataContext.healthRecords[s.id]);
	const studentIncidents = $derived(
		detailDataContext.incidents.filter(i => i.involvedStudentIds.includes(s.id)),
	);
	const studentClass = $derived(academicContext.classes.find(cl => cl.id === s.classId));
	const studentNotes = $derived(sortPedagogicalNotes(detailDataContext.pedagogicalNotes, s.id));
	const editingNote = $derived(
		modals.target ? studentNotes.find(note => note.id === modals.target) : undefined,
	);
	const notesData = $derived(buildStudentGradeSummaryFromRows(
		drawerData?.grades ?? [],
		row => detailHref.classEvaluation(row.classGroupId, row.assessmentId),
	));
	const attendanceData = $derived(summarizeStudentAttendanceHistory(drawerData?.attendance ?? []));
	const incidentsData = $derived(summarizeStudentIncidents(studentIncidents));
	const financesData = $derived(summarizeStudentFinances(detailDataContext.billing, s.id));
	const canChangePhoto = $derived(canUploadProfilePhoto('STUDENT_UPDATE'));

	const tabItems = $derived(STUDENT_TABS.map(key => ({
		key,
		label: $t(`drawer.tab.${key}`),
	})));

	async function handlePhotoChange(file: File) {
		return updateStudentProfilePhotoMutation({
			studentId: s.id,
			file,
			successMessage: get(t)('profilePhoto.updateSuccess'),
		});
	}
</script>

<div class="space-y-5">
	<DrawerEntityHeader
		name={s.name}
		summary={$t('drawer.studentSummary', { avg: s.average.toFixed(1), att: s.attendance })}
	>
		{#snippet avatar()}
			{#if canChangePhoto}
				<ProfilePhotoPicker
					name={s.name}
					initials={s.initials}
					photoUrl={s.photoUrl}
					size="list"
					onChange={handlePhotoChange}
				/>
			{:else}
				<StudentAvatar {s} />
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
					<StudentProfileEditModal {s} {disabled} {title} bind:open={editProfileOpen.open} />
				{/snippet}
			</PermissionGate>
			<ChangeClassButton {s} bind:open={changeClassOpen.open} />
		{/snippet}
	</DrawerEntityHeader>

	<DrawerTabBar tabs={tabItems} active={tabs.tab} onSelect={key => tabs.select(key as StudentTab)} scrollable />

	{#if tabs.tab === 'profile'}
		<StudentProfileTab
			{s}
			{health}
			{linkedGuardians}
			{studentNotes}
			staff={detailDataContext.staff}
		/>
	{:else if tabs.tab === 'grades'}
		<StudentGradesTab {s} {notesData} />
	{:else if tabs.tab === 'attendance'}
		<StudentAttendanceTab {s} {attendanceData} />
	{:else if tabs.tab === 'incidents'}
		<StudentIncidentsTab {s} {incidentsData} />
	{:else if tabs.tab === 'finances'}
		<StudentFinanceTab {financesData} fees={detailDataContext.fees} />
	{:else if tabs.tab === 'reportCard'}
		<StudentReportCardPanel {s} />
	{:else}
		<StudentEnrollmentsTab enrollments={drawerData?.enrollments ?? []} />
	{/if}

	<StudentGuardianLinkModal {s} bind:open={linkGuardianOpen.open} showTrigger={false} />
	<StudentNoteModal {s} note={editingNote} bind:open={noteOpen.open} showTrigger={false} />
	<StudentGradeEntryModal {s} bind:open={addGradeOpen.open} showTrigger={false} />
	<StudentAbsenceModal {s} bind:open={addAbsenceOpen.open} showTrigger={false} />
	<StudentIncidentModal {s} bind:open={addIncidentOpen.open} showTrigger={false} />
</div>

<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { updateStudentProfilePhotoMutation } from '$lib/api/mutations/profile-photo.mutations';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { detailHref } from '$lib/detail-hrefs';
	import { t } from '$lib/i18n';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import { cn } from '$lib/utils';
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
	import StudentAttendanceTab from './StudentAttendanceTab.svelte';
	import StudentEnrollmentsTab from './StudentEnrollmentsTab.svelte';
	import StudentFinanceTab from './StudentFinanceTab.svelte';
	import StudentGradesTab from './StudentGradesTab.svelte';
	import StudentIncidentsTab from './StudentIncidentsTab.svelte';
	import StudentProfileEditModal from './StudentProfileEditModal.svelte';
	import StudentProfileTab from './StudentProfileTab.svelte';
	import StudentReportCardPanel from './StudentReportCardPanel.svelte';

	const { s }: { s: Student } = $props();

	type StudentTab
		= | 'profile'
			| 'grades'
			| 'attendance'
			| 'incidents'
			| 'finances'
			| 'reportCard'
			| 'enrollments';

	let tab = $state<StudentTab>('profile');

	const drawerData = $derived(detailDataContext.studentDrawerDataFor(s.id));
	const linkedGuardians = $derived(detailDataContext.guardians.filter(g => g.studentIds.includes(s.id)));
	const health = $derived(detailDataContext.healthRecords[s.id]);
	const studentIncidents = $derived(
		detailDataContext.incidents.filter(i => i.involvedStudentIds.includes(s.id)),
	);
	const studentClass = $derived(academicContext.classes.find(cl => cl.id === s.classId));
	const studentNotes = $derived(sortPedagogicalNotes(detailDataContext.pedagogicalNotes, s.id));
	const notesData = $derived(buildStudentGradeSummaryFromRows(
		drawerData?.grades ?? [],
		row => detailHref.classEvaluation(row.classGroupId, row.assessmentId),
	));
	const attendanceData = $derived(summarizeStudentAttendanceHistory(drawerData?.attendance ?? []));
	const incidentsData = $derived(summarizeStudentIncidents(studentIncidents));
	const financesData = $derived(summarizeStudentFinances(detailDataContext.billing, s.id));
	const canChangePhoto = $derived(canUploadProfilePhoto('STUDENT_UPDATE'));

	const tabs: StudentTab[] = [
		'profile',
		'grades',
		'attendance',
		'incidents',
		'finances',
		'reportCard',
		'enrollments',
	];

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
					<StudentProfileEditModal {s} {disabled} {title} />
				{/snippet}
			</PermissionGate>
			<ChangeClassButton {s} />
		{/snippet}
	</DrawerEntityHeader>

	<div class="flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-secondary/40 p-1 text-xs">
		{#each tabs as key (key)}
			<button
				type="button"
				onclick={() => (tab = key)}
				class={cn(
					'whitespace-nowrap rounded-full px-2.5 py-1.5 font-medium transition',
					tab === key ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
				)}
			>
				{$t(`drawer.tab.${key}`)}
			</button>
		{/each}
	</div>

	{#if tab === 'profile'}
		<StudentProfileTab
			{s}
			{health}
			{linkedGuardians}
			{studentNotes}
			staff={detailDataContext.staff}
		/>
	{:else if tab === 'grades'}
		<StudentGradesTab {s} {notesData} />
	{:else if tab === 'attendance'}
		<StudentAttendanceTab {s} {attendanceData} />
	{:else if tab === 'incidents'}
		<StudentIncidentsTab {s} {incidentsData} />
	{:else if tab === 'finances'}
		<StudentFinanceTab {financesData} fees={detailDataContext.fees} />
	{:else if tab === 'reportCard'}
		<StudentReportCardPanel {s} />
	{:else}
		<StudentEnrollmentsTab enrollments={drawerData?.enrollments ?? []} />
	{/if}
</div>

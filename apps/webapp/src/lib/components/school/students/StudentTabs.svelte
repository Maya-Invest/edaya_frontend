<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { updateStudentProfilePhotoMutation } from '$lib/api/mutations/profile-photo.mutations';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { canUploadProfilePhoto } from '$lib/permissions';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import ProfilePhotoPicker from '../shared/ProfilePhotoPicker.svelte';
	import StudentAvatar from '../shared/StudentAvatar.svelte';
	import ChangeClassButton from './ChangeClassButton.svelte';
	import {
		buildStudentGradeSummary,
		sortPedagogicalNotes,
		sortStudentAbsences,
		summarizeStudentFinances,
		summarizeStudentIncidents,
	} from './student-tab-selectors.ts';
	import StudentAttendanceTab from './StudentAttendanceTab.svelte';
	import StudentFinanceTab from './StudentFinanceTab.svelte';
	import StudentGradesTab from './StudentGradesTab.svelte';
	import StudentIncidentsTab from './StudentIncidentsTab.svelte';
	import StudentProfileTab from './StudentProfileTab.svelte';
	import StudentReportCardPanel from './StudentReportCardPanel.svelte';

	const { s }: { s: Student } = $props();

	type StudentTab = 'profile' | 'notes' | 'absence' | 'incidents' | 'finances' | 'bulletin';

	let tab = $state<StudentTab>('profile');

	const linkedGuardians = $derived(detailDataContext.guardians.filter(g => g.studentIds.includes(s.id)));
	const health = $derived(detailDataContext.healthRecords[s.id]);
	const studentIncidents = $derived(detailDataContext.incidents.filter(i => i.studentId === s.id));
	const absenceRate = $derived(100 - s.attendance);
	const studentClass = $derived(academicContext.classes.find(cl => cl.id === s.classId));
	const studentNotes = $derived(sortPedagogicalNotes(detailDataContext.pedagogicalNotes, s.id));
	const notesData = $derived(buildStudentGradeSummary(s, detailDataContext.evaluations));
	const absenceData = $derived(sortStudentAbsences(detailDataContext.absences, s.id));
	const incidentsData = $derived(summarizeStudentIncidents(studentIncidents));
	const financesData = $derived(summarizeStudentFinances(detailDataContext.billing, s.id));
	const canChangePhoto = $derived(canUploadProfilePhoto('STUDENT_UPDATE'));

	async function handlePhotoChange(file: File) {
		return updateStudentProfilePhotoMutation({
			studentId: s.id,
			file,
			successMessage: get(t)('profilePhoto.updateSuccess'),
		});
	}

	const tabLabelKeys: Record<StudentTab, string | null> = {
		profile: 'drawer.tab.profile',
		notes: null,
		absence: null,
		incidents: 'drawer.tab.incidents',
		finances: null,
		bulletin: 'drawer.tab.reportCard',
	};
	const tabLabelFallback: Record<'notes' | 'absence' | 'finances', string> = {
		notes: 'Notes',
		absence: 'Absence',
		finances: 'Finances',
	};
</script>

<div class="space-y-5">
	<div class="flex items-start justify-between gap-4">
		<div class="flex items-center gap-4">
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
			<div>
				<h3 class="font-display text-2xl font-semibold leading-tight">{s.name}</h3>
				<p class="text-sm text-muted-foreground">
					{$t('drawer.studentSummary', { avg: s.average.toFixed(1), att: s.attendance })}
				</p>
			</div>
		</div>
		<div class="flex items-center gap-3">
			{#if studentClass}
				<div class="text-right leading-tight">
					<p class="text-sm font-semibold">{studentClass.name}</p>
					<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
						{studentClass.level}
					</p>
				</div>
			{/if}
			<ChangeClassButton {s} />
		</div>
	</div>

	<div class="flex items-center gap-1 rounded-full border border-border bg-secondary/40 p-1 text-xs">
		{#each ['profile', 'notes', 'absence', 'incidents', 'finances', 'bulletin'] as const as key (key)}
			<button
				onclick={() => (tab = key)}
				class={cn(
					'flex-1 rounded-full px-2.5 py-1.5 font-medium transition',
					tab === key ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
				)}
			>
				{tabLabelKeys[key] ? $t(tabLabelKeys[key]!) : tabLabelFallback[key as 'notes' | 'absence' | 'finances']}
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
	{:else if tab === 'notes'}
		<StudentGradesTab {s} {notesData} />
	{:else if tab === 'absence'}
		<StudentAttendanceTab {s} {absenceData} {absenceRate} />
	{:else if tab === 'incidents'}
		<StudentIncidentsTab {s} {incidentsData} />
	{:else if tab === 'finances'}
		<StudentFinanceTab {financesData} fees={detailDataContext.fees} />
	{:else if tab === 'bulletin'}
		<StudentReportCardPanel {s} />
	{/if}
</div>

<script lang="ts">
	import type { Student, StudentAttendanceHistoryItem } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { fmtDateFr } from '$lib/components/school/shared/drawer-constants';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { locale, t } from '$lib/i18n';
	import { Clock, Plus } from '$lib/icons';
	import { getDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { appPath } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import { classAttendanceModeForStudent } from '../../../../lib/student-attendance-history';
	import { getStudentAttendanceTabState } from '../student-attendance-tab.svelte';

	const { s }: { s: Student } = $props();

	const attendanceTab = getStudentAttendanceTabState();
	const attendanceData = $derived(attendanceTab.attendanceSummaryFor(s.id));
	const attendanceMode = $derived(classAttendanceModeForStudent(academicContext.classes, s.classId));
	const isDailyAttendance = $derived(attendanceMode === 'daily');
	const timetableHref = $derived(appPath('/(app)/classes/[classId]/timetable', { classId: s.classId }));

	const modals = getDrawerUrlModals();

	const statusTone: Record<StudentAttendanceHistoryItem['status'], string> = {
		present: 'bg-secondary text-foreground/70',
		absent: 'bg-destructive/10 text-destructive',
		late: 'bg-highlight-soft text-highlight',
	};
</script>

<div>
	<div class="grid grid-cols-3 gap-3">
		<div class="rounded-collection bg-primary/10 p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('student.attendancePresent')}</p>
			<p class="mt-1 font-display text-2xl">{attendanceData.present}</p>
		</div>
		<div class="rounded-collection bg-secondary/60 p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('student.attendanceAbsent')}</p>
			<p class="mt-1 font-display text-2xl">{attendanceData.absent}</p>
		</div>
		<div class="rounded-collection bg-secondary p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('student.attendanceLate')}</p>
			<p class="mt-1 font-display text-2xl">{attendanceData.late}</p>
		</div>
	</div>
	<div class="ui-student-tab-section">
		<div class="flex items-center justify-between gap-3">
			<h3 class="ui-student-section-title">
				{$t('student.attendanceHistory')} · {attendanceData.records.length}
			</h3>
			{#if isDailyAttendance}
				<PermissionGate
					permission="ATTENDANCE_RECORD"
					classId={s.classId}
					mode="disable"
					tooltip={$t('student.attendancePermission')}
				>
					{#snippet children({ disabled, title })}
						<Button
							variant="outline"
							size="sm"

							{disabled}
							{title}
							onclick={() => modals?.open('add-absence')}
						>
							<Plus class="mr-1 h-4 w-4" /> {$t('student.declareAbsence')}
						</Button>
					{/snippet}
				</PermissionGate>
			{:else if attendanceMode === 'session'}
				<a
					href={timetableHref}
					class="inline-flex h-9 items-center rounded-full border border-border bg-card px-3 text-sm hover:bg-secondary"
				>
					{$t('student.openClassTimetable')}
				</a>
			{/if}
		</div>
		{#if attendanceMode === 'session'}
			<p class="mt-2 text-xs text-muted-foreground">{$t('student.sessionAttendanceHint')}</p>
		{/if}
		<div class="space-y-2">
			{#if attendanceData.records.length === 0}
				<DrawerEmptyState label={$t('student.noAttendanceRecords')}>
					{#snippet icon()}
						<Clock class="h-5 w-5 text-muted-foreground" />
					{/snippet}
				</DrawerEmptyState>
			{:else}
				{#each attendanceData.records as record (record.id)}
					<div class="rounded-collection border border-border bg-card p-3">
						<div class="flex items-center justify-between gap-2">
							<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
								{$t(`student.attendanceKind.${record.kind}`)}
							</span>
							<span
								class={cn(
									'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
									statusTone[record.status],
								)}
							>
								{$t(`student.attendanceStatus.${record.status}`)}
							</span>
						</div>
						<p class="mt-1.5 text-sm font-medium">{record.label}</p>
						<p class="mt-0.5 font-sans tabular-nums text-[10px] text-muted-foreground">
							{fmtDateFr(record.date, $locale)} · {record.time}
						</p>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>

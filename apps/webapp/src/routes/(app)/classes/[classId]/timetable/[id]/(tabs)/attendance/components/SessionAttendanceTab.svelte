<script lang="ts">
	import type { PlanningEvent } from '$lib/types/school';
	import type { SessionAttendanceStatus } from '$lib/types/session-detail';
	import { page } from '$app/stores';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import Button, { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { ClipboardCheck } from '$lib/icons';
	import { bindUrlModal } from '$lib/modal/modal-state.svelte';
	import { appPath } from '$lib/navigation/app-navigation';
	import { detailNavigationSearch } from '$lib/navigation/detail-navigation';
	import AttendanceReview from '$lib/smart-components/attendance-review/AttendanceReview.svelte';
	import { cn } from '$lib/utils';
	import PlanningSessionAttendanceModal from '../../../../components/PlanningSessionAttendanceModal.svelte';
	import { getPlanningState } from '../../../../planning-state.svelte';
	import { getSessionAttendanceTabState } from '../session-attendance-tab.svelte';

	const { s }: {
		s: PlanningEvent;
	} = $props();
	const attendanceTab = getSessionAttendanceTabState();
	const planning = getPlanningState();
	const attendanceRows = $derived(attendanceTab.attendanceFor(s.id));
	const recordedCount = $derived(attendanceRows.filter(row => row.status).length);
	const modals = planning.modals;
	const sessionAttendanceOpen = bindUrlModal(modals, 'session-attendance');
	const attendanceTargetRow = $derived(modals.target ? attendanceRows.find(row => row.studentId === modals.target) : undefined);
	const statusTone: Record<SessionAttendanceStatus, string> = {
		present: 'bg-secondary text-foreground/80',
		absent: 'bg-highlight-soft text-destructive',
		late: 'bg-highlight-soft text-highlight',
	};
	async function recordAttendance(input: {
		sessionId: string;
		kind?: PlanningEvent['kind'];
		studentId: string;
		status: SessionAttendanceStatus;
		attendanceId?: string;
		successMessage?: string;
	}) {
		return attendanceTab.recordStudentAttendance(input);
	}
</script>

<div class="space-y-4">
	{#if attendanceTab.dailyMode}
		<p class="text-sm">{$t('attendanceTask.dailyMode')}</p>
		<a class={buttonVariants({ variant: 'outline', class: 'hover:bg-sky-soft active:bg-background' })} href={`${appPath('/(app)/classes/[classId]/attendance', { classId: s.classId })}${detailNavigationSearch($page.url)}`}>{$t('tab.attendance')}</a>
	{/if}
	<div class="flex flex-wrap items-center justify-between gap-3 rounded-collection bg-secondary/40 px-4 py-3 text-sm">
		<span>
			<span class="text-muted-foreground">{$t('planning.session.attendanceSummary')} :</span>
			{recordedCount} / {attendanceRows.length}
		</span>
		{#if attendanceRows.length > 0 && attendanceTab.canRecord(s.id, s.kind)}
			<PermissionGate
				permission="ATTENDANCE_RECORD"
				classId={s.classId}
				mode="disable"
				tooltip={$t('attendanceDay.permissionRecord')}
			>
				{#snippet children({ disabled, title })}
					<Button
						size="sm"
						variant="outline"

						{disabled}
						{title}
						onclick={() => planning.openAttendance(s)}
					>
						<ClipboardCheck class="mr-2 h-4 w-4" />
						{$t('attendanceTask.title')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/if}
	</div>
	<Label class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
		{$t('students.student')}
	</Label>
	{#if attendanceRows.length === 0}
		<DrawerEmptyState label={$t('planning.session.noStudents')}>
			{#snippet icon()}
				<ClipboardCheck class="h-5 w-5 text-muted-foreground" />
			{/snippet}
		</DrawerEmptyState>
	{:else}
		<ul class="overflow-hidden rounded-collection border border-border bg-card shadow-soft">
			{#each attendanceRows as row (row.studentId)}
				<li class="border-b border-border px-4 py-3 last:border-b-0">
					<div class="flex flex-wrap items-center justify-between gap-4">
						<div class="flex min-w-0 flex-1 items-center gap-3">
							<div
								class="flex h-9 w-9 items-center justify-center rounded-collection bg-primary font-display text-xs font-semibold text-primary-foreground"
							>
								{row.studentInitials}
							</div>
							<p class="break-words text-sm font-medium">{row.studentName}</p>
						</div>
						<div class="flex flex-wrap items-center gap-2">
							{#if row.attendanceId}<AttendanceReview recordId={row.attendanceId} classId={s.classId} />{/if}
							{#if row.status}
								<span
									class={cn(
										'rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wider',
										statusTone[row.status],
									)}
								>
									{$t(`attendance.${row.status}`)}
								</span>
							{:else}
								<span class="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
									{$t('planning.session.notRecorded')}
								</span>
							{/if}
							{#if attendanceTab.canRecord(s.id, s.kind)}
								<PermissionGate
									permission="ATTENDANCE_RECORD"
									classId={s.classId}
									mode="disable"
									tooltip="Droit ATTENDANCE_RECORD requis."
								>
									{#snippet children({ disabled, title })}
										<Button
											variant="ghost"
											size="sm"

											{disabled}
											{title}
											onclick={() => modals.open('session-attendance', { target: row.studentId })}
										>
											{row.status ? $t('common.edit') : $t('planning.session.recordAttendance')}
										</Button>
									{/snippet}
								</PermissionGate>
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if attendanceTargetRow && attendanceTab.canRecord(s.id, s.kind)}
	{#key `${s.id}|${attendanceTargetRow.studentId}`}
		<PlanningSessionAttendanceModal
			sessionId={s.id}
			kind={s.kind}
			row={attendanceTargetRow}
			bind:open={sessionAttendanceOpen.open}
			showTrigger={false}
			onRecord={recordAttendance}
		/>
	{/key}
{/if}

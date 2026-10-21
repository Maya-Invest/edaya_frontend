<script lang="ts">
	import type { PlanningEvent } from '$lib/types/school';
	import type { SessionAttendanceStatus } from '$lib/types/session-detail';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Check, ClipboardCheck } from '$lib/icons';
	import { bindUrlModal } from '$lib/modal/modal-state.svelte';
	import AttendanceReview from '$lib/smart-components/attendance-review/AttendanceReview.svelte';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import PlanningSessionAttendanceModal from '../../../../components/PlanningSessionAttendanceModal.svelte';
	import { getPlanningState } from '../../../../planning-state.svelte';
	import { getSessionAttendanceTabState } from '../session-attendance-tab.svelte';

	const { s }: {
		s: PlanningEvent;
	} = $props();
	const attendanceTab = getSessionAttendanceTabState();
	const planning = getPlanningState();
	const isLesson = $derived(s.kind === 'lesson');
	const attendanceRows = $derived(attendanceTab.attendanceFor(s.id));
	const recordedCount = $derived(attendanceRows.filter(row => row.status).length);
	const unrecordedRows = $derived(attendanceRows.filter(row => !row.status));
	let bulkBusy = $state(false);
	const modals = planning.modals;
	const sessionAttendanceOpen = bindUrlModal(modals, 'session-attendance');
	const attendanceTargetRow = $derived(modals.target ? attendanceRows.find(row => row.studentId === modals.target) : undefined);
	const statusTone: Record<SessionAttendanceStatus, string> = {
		present: 'bg-secondary text-foreground/80',
		absent: 'bg-highlight-soft text-destructive',
		late: 'bg-highlight-soft text-highlight',
	};
	async function markAllPresent() {
		if (unrecordedRows.length === 0) {
			return;
		}
		bulkBusy = true;
		if (isLesson) {
			await attendanceTab.recordBulkAttendance({
				sessionId: s.id,
				attendanceByStudent: Object.fromEntries(unrecordedRows.map(row => [row.studentId, 'present' as const])),
				successMessage: get(t)('planning.session.bulkAttendanceSuccess'),
			});
		}
		else {
			for (const row of unrecordedRows) {
				await attendanceTab.recordStudentAttendance({
					sessionId: s.id,
					kind: s.kind,
					studentId: row.studentId,
					status: 'present',
					attendanceId: row.attendanceId,
				});
			}
			toast.success(get(t)('planning.session.bulkAttendanceSuccess'));
		}
		bulkBusy = false;
	}
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
	<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/40 px-4 py-3 text-sm">
		<span>
			<span class="text-muted-foreground">{$t('planning.session.attendanceSummary')} :</span>
			{recordedCount} / {attendanceRows.length}
		</span>
		{#if unrecordedRows.length > 0}
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
						class="h-8 rounded-full text-xs"
						disabled={disabled || bulkBusy}
						{title}
						onclick={markAllPresent}
					>
						<Check class="mr-1 h-3.5 w-3.5" />
						{$t('attendanceDay.markAllPresent')}
					</Button>
				{/snippet}
			</PermissionGate>
		{/if}
	</div>
	<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
		{$t('students.student')}
	</Label>
	{#if attendanceRows.length === 0}
		<DrawerEmptyState label={$t('planning.session.noStudents')}>
			{#snippet icon()}
				<ClipboardCheck class="h-5 w-5 text-muted-foreground" />
			{/snippet}
		</DrawerEmptyState>
	{:else}
		<ul class="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
			{#each attendanceRows as row (row.studentId)}
				<li class="border-b border-border px-4 py-3 last:border-b-0">
					<div class="flex items-center justify-between gap-3">
						<div class="flex items-center gap-3">
							<div
								class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-display text-xs font-semibold text-primary-foreground"
							>
								{row.studentInitials}
							</div>
							<p class="text-sm font-medium">{row.studentName}</p>
						</div>
						<div class="flex items-center gap-2">
							{#if row.attendanceId}<AttendanceReview recordId={row.attendanceId} classId={s.classId} />{/if}
							{#if row.status}
								<span
									class={cn(
										'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
										statusTone[row.status],
									)}
								>
									{$t(`attendance.${row.status}`)}
								</span>
							{:else}
								<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
									{$t('planning.session.notRecorded')}
								</span>
							{/if}
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
										class="h-7 rounded-full px-2.5 text-[11px]"
										{disabled}
										{title}
										onclick={() => modals.open('session-attendance', { target: row.studentId })}
									>
										{row.status ? $t('common.edit') : $t('planning.session.recordAttendance')}
									</Button>
								{/snippet}
							</PermissionGate>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if attendanceTargetRow}
	<PlanningSessionAttendanceModal
		sessionId={s.id}
		kind={s.kind}
		row={attendanceTargetRow}
		bind:open={sessionAttendanceOpen.open}
		showTrigger={false}
		onRecord={recordAttendance}
	/>
{/if}

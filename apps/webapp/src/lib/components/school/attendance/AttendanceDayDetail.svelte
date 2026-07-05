<script lang="ts">
	import type { AttendanceDay } from '$lib/types/school';
	import type { SessionAttendanceStatus } from '$lib/types/session-detail';
	import { loadAttendanceDayDetail } from '$lib/api/attendance-data';
	import { recordClassDailyAttendanceMutation } from '$lib/api/mutations/attendance.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { locale, t } from '$lib/i18n';
	import { Check, ClipboardCheck } from '$lib/icons';
	import { queryClient } from '$lib/queries/client';
	import { sessionDetailContext } from '$lib/session-detail/context.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import DrawerEmptyState from '../shared/DrawerEmptyState.svelte';
	import AttendanceDayRecordModal from './AttendanceDayRecordModal.svelte';

	const { day }: { day: AttendanceDay } = $props();

	const statusTone: Record<SessionAttendanceStatus, string> = {
		present: 'bg-secondary text-foreground/80',
		absent: 'bg-highlight-soft text-destructive',
		late: 'bg-highlight-soft text-highlight',
	};

	const detail = $derived(sessionDetailContext.get(day.id));
	const attendanceRows = $derived(detail?.attendance ?? []);
	const recordedCount = $derived(attendanceRows.filter(row => row.status).length);
	const unrecordedStudentIds = $derived(
		attendanceRows.filter(row => !row.status).map(row => row.studentId),
	);

	let loading = $state(false);
	let bulkBusy = $state(false);

	$effect(() => {
		const occurrenceId = day.id;
		if (sessionDetailContext.get(occurrenceId)) {
			return;
		}

		loading = true;
		let cancelled = false;

		void loadAttendanceDayDetail(queryClient(), occurrenceId).then((loaded) => {
			if (cancelled) {
				return;
			}
			if (loaded) {
				sessionDetailContext.hydrate(occurrenceId, loaded);
			}
			loading = false;
		});

		return () => {
			cancelled = true;
		};
	});

	async function markAllPresent() {
		if (unrecordedStudentIds.length === 0) {
			return;
		}

		bulkBusy = true;
		const attendanceByStudent = Object.fromEntries(
			unrecordedStudentIds.map(studentId => [studentId, 'present' as const]),
		) satisfies Record<string, SessionAttendanceStatus>;

		await recordClassDailyAttendanceMutation({
			occurrenceId: day.id,
			classGroupId: day.classId,
			date: day.date,
			attendanceByStudent,
			successMessage: get(t)('attendanceDay.bulkSuccess'),
		});
		bulkBusy = false;
	}
</script>

<div class="flex min-h-0 flex-col">
	<div class="shrink-0 space-y-5">
		<div>
			<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
				{$t('attendanceDay.dailyRollCall')}
			</p>
			<h3 class="mt-1 font-display text-2xl font-semibold">{day.label}</h3>
			<p class="mt-1 text-sm text-muted-foreground">
				{new Date(day.date).toLocaleDateString($locale, {
					weekday: 'long',
					day: 'numeric',
					month: 'long',
					year: 'numeric',
				})}
			</p>
		</div>

		{#if loading}
			<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
		{:else}
			<div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/40 px-4 py-3 text-sm">
				<span>
					<span class="text-muted-foreground">{$t('attendanceDay.recorded')} :</span>
					{recordedCount} / {attendanceRows.length}
				</span>
				{#if unrecordedStudentIds.length > 0}
					<PermissionGate
						permission="ATTENDANCE_RECORD"
						classId={day.classId}
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
		{/if}
	</div>

	{#if !loading}
		<div class="mt-4 flex min-h-0 flex-1 flex-col">
			<Label class="shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('students.student')}
			</Label>

			{#if attendanceRows.length === 0}
				<DrawerEmptyState label={$t('planning.session.noStudents')}>
					{#snippet icon()}
						<ClipboardCheck class="h-5 w-5 text-muted-foreground" />
					{/snippet}
				</DrawerEmptyState>
			{:else}
				<ul
					class="scrollbar-thin mt-2 max-h-[min(32rem,calc(100dvh-16rem))] overflow-y-auto rounded-2xl border border-border bg-card shadow-soft"
				>
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
										classId={day.classId}
										mode="disable"
										tooltip={$t('attendanceDay.permissionRecord')}
									>
										{#snippet children({ disabled, title })}
											<AttendanceDayRecordModal
												occurrenceId={day.id}
												classGroupId={day.classId}
												date={day.date}
												studentId={row.studentId}
												studentName={row.studentName}
												attendanceId={row.attendanceId}
												status={row.status}
												{disabled}
												{title}
											/>
										{/snippet}
									</PermissionGate>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

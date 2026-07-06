<script lang="ts">
	import type { AttendanceDay } from '$lib/types/school';
	import type { SessionAttendanceStatus } from '$lib/types/session-detail';
	import { page } from '$app/stores';
	import { loadAttendanceDayDetail } from '$lib/api/attendance-data';
	import { recordClassDailyAttendanceMutation } from '$lib/api/mutations/attendance.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { locale, t } from '$lib/i18n';
	import { Check, ClipboardCheck } from '$lib/icons';
	import { queryClient } from '$lib/queries/client';
	import { sessionDetailContext } from '$lib/session-detail/context.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import DrawerEntityHeader from '../shared/DrawerEntityHeader.svelte';
	import DrawerEmptyState from '../shared/DrawerEmptyState.svelte';
	import AttendanceDayRecordModal from './AttendanceDayRecordModal.svelte';

	const { day }: { day: AttendanceDay } = $props();

	type AttendanceDayDrawerModal = 'record-attendance';

	const modals = createUrlSyncedModals<AttendanceDayDrawerModal>({
		allowed: ['record-attendance'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const recordAttendanceOpen = bindUrlModal(modals, 'record-attendance');

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

	const recordTargetRow = $derived(
		modals.target ? attendanceRows.find(row => row.studentId === modals.target) : undefined,
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
	const formattedDate = $derived(
		new Date(day.date).toLocaleDateString($locale, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		}),
	);
</script>

<div class="flex min-h-0 flex-col">
	<div class="shrink-0 space-y-5">
		<DrawerEntityHeader name={day.label} summary={formattedDate}>
			{#snippet chips()}
				<span class="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] tabular-nums text-foreground/80">
					{$t('attendanceDay.recordedSummary', {
						recorded: recordedCount,
						total: attendanceRows.length || day.totalStudents,
					})}
				</span>
			{/snippet}
			{#snippet actions()}
				{#if !loading && unrecordedStudentIds.length > 0}
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
								class="rounded-full"
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
			{/snippet}
		</DrawerEntityHeader>

		{#if loading}
			<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
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
											<Button
												variant="ghost"
												size="sm"
												class="h-7 rounded-full px-2.5 text-[11px]"
												{disabled}
												{title}
												onclick={() => modals.open('record-attendance', { target: row.studentId })}
											>
												{row.status ? $t('common.edit') : $t('attendanceDay.record')}
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
	{/if}
</div>

{#if recordTargetRow}
	<AttendanceDayRecordModal
		occurrenceId={day.id}
		classGroupId={day.classId}
		date={day.date}
		studentId={recordTargetRow.studentId}
		studentName={recordTargetRow.studentName}
		attendanceId={recordTargetRow.attendanceId}
		status={recordTargetRow.status}
		bind:open={recordAttendanceOpen.open}
		showTrigger={false}
	/>
{/if}

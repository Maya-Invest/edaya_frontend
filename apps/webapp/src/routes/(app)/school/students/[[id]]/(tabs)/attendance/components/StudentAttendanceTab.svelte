<script lang="ts">
	import type { Student, StudentAttendanceHistoryItem } from '$lib/types/school';
	import { fmtDateFr } from '$lib/components/school/shared/drawer-constants';
	import DrawerEmptyState from '$lib/components/school/shared/DrawerEmptyState.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Clock, Plus } from '$lib/icons';
	import { getDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { cn } from '$lib/utils';
	import { getStudentAttendanceTabState } from '../student-attendance-tab.svelte';

	const { s }: { s: Student } = $props();

	const attendanceTab = getStudentAttendanceTabState();
	const attendanceData = $derived(attendanceTab.attendanceSummaryFor(s.id));

	const modals = getDrawerUrlModals();

	const statusTone: Record<StudentAttendanceHistoryItem['status'], string> = {
		present: 'bg-secondary text-foreground/70',
		absent: 'bg-destructive/10 text-destructive',
		late: 'bg-highlight-soft text-highlight',
	};
</script>

<div class="space-y-4">
	<div class="grid grid-cols-3 gap-3">
		<div class="rounded-xl bg-primary/10 p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('student.attendancePresent')}</p>
			<p class="mt-1 font-display text-2xl">{attendanceData.present}</p>
		</div>
		<div class="rounded-xl bg-secondary/60 p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('student.attendanceAbsent')}</p>
			<p class="mt-1 font-display text-2xl">{attendanceData.absent}</p>
		</div>
		<div class="rounded-xl bg-secondary p-4">
			<p class="text-[10px] uppercase tracking-wider text-muted-foreground">{$t('student.attendanceLate')}</p>
			<p class="mt-1 font-display text-2xl">{attendanceData.late}</p>
		</div>
	</div>
	<div>
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('student.attendanceHistory')}
		</Label>
		<div class="mt-2 space-y-2">
			{#if attendanceData.records.length === 0}
				<DrawerEmptyState label={$t('student.noAttendanceRecords')}>
					{#snippet icon()}
						<Clock class="h-5 w-5 text-muted-foreground" />
					{/snippet}
				</DrawerEmptyState>
			{:else}
				{#each attendanceData.records as record (record.id)}
					<div class="rounded-xl border border-border bg-card p-3">
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
						<p class="mt-0.5 font-mono text-[10px] text-muted-foreground">
							{fmtDateFr(record.date)} · {record.time}
						</p>
					</div>
				{/each}
			{/if}
		</div>
	</div>
	<PermissionGate
		permission="ATTENDANCE_RECORD"
		classId={s.classId}
		mode="disable"
		tooltip={$t('student.attendancePermission')}
	>
		{#snippet children({ disabled, title })}
			<Button
				variant="ghost"
				class="w-full rounded-full border border-dashed border-border"
				{disabled}
				{title}
				onclick={() => modals?.open('add-absence')}
			>
				<Plus class="mr-1 h-4 w-4" /> Déclarer une absence
			</Button>
		{/snippet}
	</PermissionGate>
</div>

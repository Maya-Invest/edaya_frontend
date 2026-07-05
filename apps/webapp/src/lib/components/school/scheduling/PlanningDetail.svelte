<script lang="ts">
	import type { PlanningEvent } from '$lib/types/school';
	import type { SessionAttendanceStatus } from '$lib/types/session-detail';
	import { cancelPlanningEventMutation } from '$lib/api/mutations/planning.mutations';
	import {
		recordLessonSessionBulkAttendanceMutation,
		recordSessionStudentAttendanceMutation,
	} from '$lib/api/mutations/planning-session.mutations';
	import { loadPlanningOccurrenceDetail } from '$lib/api/session-detail-data';
	import Button from '$lib/components/ui/button/button.svelte';
	import DeleteEntityButton from '$lib/components/ui/DeleteEntityButton.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Check, ClipboardCheck, FileText, MapPin } from '$lib/icons';
	import { queryClient } from '$lib/queries/client';
	import { sessionDetailContext } from '$lib/session-detail/context.svelte';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import DrawerActionBar from '../shared/DrawerActionBar.svelte';
	import DrawerEmptyState from '../shared/DrawerEmptyState.svelte';
	import DrawerField from '../shared/DrawerField.svelte';
	import PlanningFormModal from './PlanningFormModal.svelte';
	import PlanningSessionAttendanceModal from './PlanningSessionAttendanceModal.svelte';
	import PlanningSessionLogbookModal from './PlanningSessionLogbookModal.svelte';

	const { s }: { s: PlanningEvent } = $props();

	type PlanningTab = 'details' | 'attendance' | 'logbook';

	let tab = $state<PlanningTab>('details');

	const isLesson = $derived(s.kind === 'lesson');
	const isActivity = $derived(s.kind === 'activity');
	const canCancel = $derived((isLesson || isActivity) && s.status !== 'cancelled');
	const canEditLesson = $derived(isLesson && s.status !== 'cancelled');
	const showLogbookTab = $derived(isLesson || isActivity);

	const detail = $derived(sessionDetailContext.get(s.id));
	const attendanceRows = $derived(detail?.attendance ?? []);
	const recordedCount = $derived(attendanceRows.filter(row => row.status).length);
	const unrecordedRows = $derived(attendanceRows.filter(row => !row.status));

	let bulkBusy = $state(false);

	const statusTone: Record<SessionAttendanceStatus, string> = {
		present: 'bg-secondary text-foreground/80',
		absent: 'bg-highlight-soft text-destructive',
		late: 'bg-highlight-soft text-highlight',
	};

	const tabLabelKeys: Record<PlanningTab, string> = {
		details: 'planning.session.detailsTab',
		attendance: 'planning.session.attendanceTab',
		logbook: 'subjects.tab.logbook',
	};

	const visibleTabs = $derived(
		showLogbookTab ? (['details', 'attendance', 'logbook'] as const) : (['details', 'attendance'] as const),
	);

	let sessionLoading = $state(false);

	$effect(() => {
		const sessionId = s.id;
		const kind = s.kind;
		if (sessionDetailContext.get(sessionId)) {
			return;
		}

		sessionLoading = true;
		let cancelled = false;

		void loadPlanningOccurrenceDetail(queryClient(), { id: sessionId, kind }).then((loaded) => {
			if (cancelled) {
				return;
			}
			if (loaded) {
				sessionDetailContext.hydrate(sessionId, loaded);
			}
			sessionLoading = false;
		});

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!showLogbookTab && tab === 'logbook') {
			tab = 'details';
		}
	});

	async function markAllPresent() {
		if (unrecordedRows.length === 0) {
			return;
		}

		bulkBusy = true;
		if (isLesson) {
			await recordLessonSessionBulkAttendanceMutation({
				sessionId: s.id,
				attendanceByStudent: Object.fromEntries(
					unrecordedRows.map(row => [row.studentId, 'present' as const]),
				),
				successMessage: get(t)('planning.session.bulkAttendanceSuccess'),
			});
		}
		else {
			for (const row of unrecordedRows) {
				await recordSessionStudentAttendanceMutation({
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
</script>

<div class="space-y-5">
	<div>
		<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
			{$t(`day.full.${s.day}`)} · {s.start} — {s.end}
		</p>
		<h3 class="mt-1 font-display text-2xl font-semibold">{s.title}</h3>
		<p class="mt-1 text-sm text-muted-foreground">
			{$t(`planning.eventKind.${s.kind}`)} · {s.subject} · {s.teacher}
		</p>
		{#if s.status === 'cancelled'}
			<p class="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{$t('planning.occurrenceStatus.cancelled')}
			</p>
		{:else if s.status === 'completed'}
			<p class="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{$t('planning.occurrenceStatus.completed')}
			</p>
		{/if}
	</div>

	<div class="flex items-center gap-1 rounded-full border border-border bg-secondary/40 p-1 text-xs">
		{#each visibleTabs as key (key)}
			<button
				onclick={() => (tab = key)}
				class={cn(
					'flex-1 rounded-full px-2.5 py-1.5 font-medium transition',
					tab === key ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
				)}
			>
				{$t(tabLabelKeys[key])}
			</button>
		{/each}
	</div>

	{#if tab === 'details'}
		<DrawerField label={$t('drawer.title')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{s.title}</div>
		</DrawerField>
		<DrawerField label={$t('drawer.subject')}>
			<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{s.subject}</div>
		</DrawerField>
		<div class="grid grid-cols-2 gap-3">
			<DrawerField label={$t('drawer.start')}>
				<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{s.start}</div>
			</DrawerField>
			<DrawerField label={$t('drawer.end')}>
				<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{s.end}</div>
			</DrawerField>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<DrawerField label={$t('drawer.room')}>
				<div class="flex min-h-10 items-center gap-2 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">
					<MapPin class="h-3.5 w-3.5 text-muted-foreground" />
					{s.room}
				</div>
			</DrawerField>
			<DrawerField label={$t('subjects.teacher')}>
				<div class="min-h-10 rounded-md border border-input bg-secondary/30 px-3 py-2 text-sm">{s.teacher}</div>
			</DrawerField>
		</div>
		{#if canEditLesson || canCancel}
			<DrawerActionBar>
				{#if canEditLesson}
					<PlanningFormModal event={s} />
				{/if}
				{#if canCancel}
					<PermissionGate permission="TIMETABLE_UPDATE" mode="disable" tooltip={$t('calendar.permissionUpdate')}>
						{#snippet children({ disabled, title })}
							<DeleteEntityButton
								{disabled}
								{title}
								confirmTitle={$t('planning.cancelConfirmTitle')}
								confirmDescription={$t('planning.cancelConfirm', { title: s.title })}
								onConfirm={() => cancelPlanningEventMutation(s, {
									successMessage: get(t)('planning.toastCancelled', { title: s.title }),
								})}
							/>
						{/snippet}
					</PermissionGate>
				{/if}
			</DrawerActionBar>
		{/if}
	{:else if tab === 'attendance'}
		{#if sessionLoading}
			<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
		{:else}
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
												<PlanningSessionAttendanceModal
													sessionId={s.id}
													kind={s.kind}
													{row}
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
	{:else if sessionLoading}
		<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
	{:else if detail}
		<div class="space-y-4">
			<div class="flex items-center justify-between gap-2">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('subjects.tab.logbook')}
				</Label>
				{#if isLesson}
					<PermissionGate
						permission={detail.logbook ? 'CLASS_LOGBOOK_UPDATE' : 'CLASS_LOGBOOK_CREATE'}
						classId={s.classId}
						mode="disable"
						tooltip="Droit cahier de texte requis."
					>
						{#snippet children({ disabled, title })}
							<PlanningSessionLogbookModal {detail} {disabled} {title} />
						{/snippet}
					</PermissionGate>
				{/if}
			</div>
			{#if detail.logbook}
				<article class="rounded-2xl border border-border bg-card p-4 shadow-soft">
					<div class="flex items-start justify-between gap-2">
						<h4 class="font-display text-sm font-semibold">{detail.logbook.chapter}</h4>
						{#if isLesson}
							<span class="font-mono text-[10px] text-muted-foreground">{detail.logbook.progress}%</span>
						{/if}
					</div>
					<p class="mt-2 text-xs leading-relaxed text-foreground/80">{detail.logbook.content}</p>
					{#if isLesson && detail.logbook.objectives.length > 0}
						<ul class="mt-2 space-y-1">
							{#each detail.logbook.objectives as objective (objective)}
								<li class="flex items-start gap-1.5 text-[11px]">
									<Check class="mt-0.5 h-3 w-3 text-accent" />
									{objective}
								</li>
							{/each}
						</ul>
					{/if}
					{#if detail.logbook.homework}
						<p class="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
							<FileText class="h-3 w-3" />
							<span class="font-medium text-foreground">{$t('teaching.homework')} :</span>
							{detail.logbook.homework}
						</p>
					{/if}
				</article>
			{:else}
				<DrawerEmptyState label={$t('planning.session.noLogbook')}>
					{#snippet icon()}
						<FileText class="h-5 w-5 text-muted-foreground" />
					{/snippet}
				</DrawerEmptyState>
				{#if isLesson}
					<PermissionGate
						permission="CLASS_LOGBOOK_CREATE"
						classId={s.classId}
						mode="disable"
						tooltip="Droit CLASS_LOGBOOK_CREATE requis."
					>
						{#snippet children({ disabled, title })}
							<PlanningSessionLogbookModal {detail} {disabled} {title} />
						{/snippet}
					</PermissionGate>
				{/if}
			{/if}
		</div>
	{:else}
		<p class="text-sm text-muted-foreground">{$t('dataState.loading')}</p>
	{/if}
</div>

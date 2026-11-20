<script lang="ts">
	import type { PageQueryRequest } from '$lib/queries/page-status';
	import type { ActivityEnrollmentStatus } from '$lib/types/school';
	import { page } from '$app/stores';
	import { academicContext } from '$lib/academic/context.svelte';
	import { ENROLL_NEXT } from '$lib/components/school/shared/drawer-constants';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import PickerModal from '$lib/components/ui/PickerModal.svelte';
	import { drawerTabRouteCacheKey } from '$lib/detail-route-patterns';
	import { t } from '$lib/i18n';
	import { Plus, Trash2 } from '$lib/icons';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { writeModalSurface } from '$lib/modal/modal-url';
	import { replaceRouteSurface } from '$lib/navigation/route-surface-navigation';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getActivitiesPageState } from '../../../activities-page.svelte';
	import { studentDisplayFallback } from '../../../lib/activity-selectors';
	import { getActivityStudentsTabState, pickerStudent, removalFromUrl } from './activity-students-tab.svelte';
	import ActivityPupilPicker from './ActivityPupilPicker.svelte';

	const activitiesPage = getActivitiesPageState();
	const studentsTab = getActivityStudentsTabState();
	const loadTab = studentsTab.query();
	const activityId = $derived($page.params.id ?? '');
	const activity = $derived(activityId ? activitiesPage.findActivity(activityId) : undefined);
	const enrollments = $derived(studentsTab.slice?.items ?? []);
	let pickerRevision = $state(0);

	const classesById = $derived(new Map(academicContext.classes.map(group => [group.id, group])));

	type ActivityStudentsModal = 'edit' | 'delete' | 'add-students' | 'remove-enrollment';
	const modals = createUrlSyncedModals<ActivityStudentsModal>({
		allowed: ['edit', 'delete', 'add-students', 'remove-enrollment'],
		getUrl: () => $page.url,
	});
	$effect(() => {
		modals.hydrate();
		untrack(validateModal);
	});
	const addOpen = bindUrlModal(modals, 'add-students');
	const removeOpen = bindUrlModal(modals, 'remove-enrollment');
	let studentIds = $state<string[]>([]);
	let pickerSession = 0;
	$effect(() => {
		void addOpen.open;
		void activityId;
		void academicContext.scopeGeneration;
		studentIds = [];
		pickerSession += 1;
		return () => {
			pickerSession += 1;
		};
	});
	let busy = $state(false);
	let removeBusy = $state(false);

	const canAddStudents = $derived(studentsTab.slice?.canAdd ?? false);
	const addStudentsDescription = $derived(
		canAddStudents
			? $t('activities.addStudentsFromLinkedClasses')
			: $t('activities.addStudentsRequiresLinkedClasses'),
	);
	const removeTarget = $derived(
		modals.isOpen('remove-enrollment') && modals.target
			? enrollments.find(enrollment => enrollment.id === modals.target) ?? (studentsTab.slice?.selected?.id === modals.target ? studentsTab.slice.selected : undefined)
			: undefined,
	);
	const removeStudentName = $derived(
		removeTarget
			? ((removeTarget.student ? pickerStudent(removeTarget.student).name : undefined) ?? studentDisplayFallback(removeTarget.studentId))
			: '—',
	);

	let removalOrigin: { button: HTMLButtonElement; viewport: HTMLElement; top: number; scope: string; activityId: string } | undefined;

	function openRemoval(id: string, button: HTMLButtonElement) {
		const viewport = button.closest<HTMLElement>('[data-activity-drawer-scroll]');
		removalOrigin = viewport ? { button, viewport, top: viewport.scrollTop, scope: activitiesPage.scope, activityId } : undefined;
		modals.open('remove-enrollment', { target: id });
	}

	function restoreRosterPosition(event: Event) {
		const origin = removalOrigin;
		removalOrigin = undefined;
		if (!origin || !origin.viewport.isConnected || origin.scope !== activitiesPage.scope || origin.activityId !== activityId)
			return;
		event.preventDefault();
		if (origin.button.isConnected)
			origin.button.focus({ preventScroll: true });
		origin.viewport.scrollTop = origin.top;
	}

	function canonicalizeModal(modal: ActivityStudentsModal | null) {
		replaceRouteSurface(writeModalSurface($page.url, { modal }));
	}

	function validateModal() {
		if (!modals.ready || studentsTab.slice?.activityId !== activityId || !modals.active) {
			return;
		}
		if (
			(modals.active === 'edit' || modals.active === 'delete' || modals.active === 'add-students')
			&& modals.target
		) {
			canonicalizeModal(modals.active);
			return;
		}
		if (
			modals.active === 'remove-enrollment'
			&& studentsTab.slice.requestedId === (modals.target ?? undefined) && !removeTarget
		) {
			canonicalizeModal(null);
		}
	}

	async function query(url: URL, request: PageQueryRequest) {
		const result = await loadTab(url, request);
		request.signal.throwIfAborted();
		validateModal();
		return result;
	}

	function enrollStatusLabel(status: ActivityEnrollmentStatus): string {
		return get(t)(`activities.enrollStatus.${status}`);
	}

	function enrollStatusStyle(status: ActivityEnrollmentStatus): string {
		if (status === 'approved') {
			return 'rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground';
		}
		if (status === 'pending') {
			return 'rounded-full border border-highlight/20 bg-highlight-soft px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-highlight';
		}
		return 'rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive';
	}

	async function toggleStatus(enrollment: (typeof enrollments)[number]) {
		if (!activity || busy) {
			return;
		}

		const targetId = activity.id;
		busy = true;
		await activitiesPage.enrollStudent({
			activityId: activity.id,
			studentId: enrollment.studentId,
			status: ENROLL_NEXT[enrollment.status],
			enrollmentId: enrollment.id,
			successMessage: get(t)('activities.enrollStatusSuccess'),
		});
		await studentsTab.refresh(targetId);
		busy = false;
	}

	async function confirmAddStudents() {
		if (!activity || studentIds.length === 0 || busy)
			return;
		const targetId = activity.id;
		const generation = academicContext.scopeGeneration;
		const session = pickerSession;
		const current = () => session === pickerSession && addOpen.open && activityId === targetId && academicContext.scopeGeneration === generation;
		busy = true;
		try {
			const result = await activitiesPage.addStudents(targetId, studentIds, current);
			if (!current())
				return;
			studentIds = result.remaining;
			if (result.succeeded.length > 0) {
				toast.success(get(t)('activities.enrollStudentsSuccess', { n: result.succeeded.length }));
				pickerRevision++;
				await studentsTab.refresh(targetId);
				if (!current())
					return;
			}
			if (result.remaining.length === 0)
				modals.close();
			else toast.error(get(t)('common.partialSelection', { n: result.remaining.length }));
		}
		finally {
			busy = false;
		}
	}

	async function confirmRemoveEnrollment() {
		if (!activity || !removeTarget || removeBusy) {
			return;
		}

		const targetId = activity.id;
		const scope = activitiesPage.scope;
		removeBusy = true;
		const ok = await activitiesPage.removeEnrollment({
			activityId: activity.id,
			enrollmentId: removeTarget.id,
			successMessage: get(t)('activities.removeEnrollmentSuccess'),
		});
		removeBusy = false;
		if (ok && targetId === activityId && scope === activitiesPage.scope) {
			await studentsTab.refresh(targetId);
			modals.close();
		}
	}

</script>

{#if activity}
	<PageQuery {query} cache={false} preserveWhileLoading cacheKey={url => JSON.stringify([drawerTabRouteCacheKey(url), removalFromUrl(url)])} loadingTitle={$t('activities.enrolledStudents')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<div class="rounded-collection border border-border bg-card">
					<div class="flex items-center justify-between border-b border-border px-4 py-2.5">
						<p class="font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
							{$t('activities.enrolledStudents')} · {studentsTab.slice?.total ?? activity.enrollmentCount}
						</p>
						<PermissionGate permission="ACTIVITY_ENROLLMENT_MANAGE" mode="disable" tooltip={$t('activities.permissionUpdate')}>
							{#snippet children({ disabled, title })}
								<Button
									size="sm"
									variant="outline"
									class="text-xs"
									disabled={disabled || busy || !canAddStudents}
									title={!canAddStudents ? $t('activities.addStudentsRequiresLinkedClasses') : title}
									onclick={() => modals.open('add-students')}
								>
									<Plus class="mr-1 h-3.5 w-3.5" /> {$t('activities.addStudent')}
								</Button>
							{/snippet}
						</PermissionGate>
					</div>
					{#if enrollments.length === 0}
						<p class="px-4 py-6 text-center text-sm text-muted-foreground">{$t('activities.noEnrollments')}</p>
					{:else}
						<ul class="divide-y divide-border">
							{#each enrollments as enrollment (enrollment.id)}
								{@const student = enrollment.student ? pickerStudent(enrollment.student) : undefined}
								{@const classGroup = student ? classesById.get(student.classId) : undefined}
								<li class="flex items-center justify-between gap-3 px-4 py-2.5">
									<div class="flex min-w-0 items-center gap-2">
										<span
											class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-[10px] font-semibold"
										>
											{student?.initials ?? enrollment.studentId.slice(-2).toUpperCase()}
										</span>
										<div class="min-w-0">
											<p class="truncate text-sm font-medium">
												{student?.name ?? studentDisplayFallback(enrollment.studentId)}
											</p>
											<p class="truncate text-[11px] text-muted-foreground">{classGroup?.name ?? '—'}</p>
										</div>
									</div>
									<PermissionGate permission="ACTIVITY_ENROLLMENT_MANAGE" mode="disable" tooltip={$t('activities.permissionUpdate')}>
										{#snippet children({ disabled, title })}
											<div class="flex items-center gap-2">
												<button
													type="button"
													onclick={() => toggleStatus(enrollment)}
													disabled={disabled || busy}
													title={title ?? $t('activities.enrollStatusToggleHint')}
													class={cn('transition-colors disabled:opacity-50', enrollStatusStyle(enrollment.status))}
												>
													{enrollStatusLabel(enrollment.status)}
												</button>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													class="w-8 text-muted-foreground hover:text-destructive"
													disabled={disabled || busy}
													title={$t('activities.removeEnrollment')}
													onclick={event => openRemoval(enrollment.id, event.currentTarget)}
												>
													<Trash2 class="h-4 w-4" />
												</Button>
											</div>
										{/snippet}
									</PermissionGate>
								</li>
							{/each}
						</ul>
					{/if}
					{#if studentsTab.failed}
						<DataState compact status="error" onRetry={() => void studentsTab.refresh(activityId)} />
					{:else if studentsTab.slice?.nextCursor}
						<Button variant="outline" size="sm" disabled={studentsTab.loading} onclick={() => void studentsTab.more()}>{$t('activities.morePupils')}</Button>
					{/if}
				</div>
			</DataState>
		{/snippet}
	</PageQuery>
{/if}

<PickerModal
	dirty={studentIds.length > 0}
	bind:open={addOpen.open}
	title={activity ? $t('activities.addStudentTitle', { name: activity.name }) : $t('activities.addStudent')}
	description={addStudentsDescription}
	confirmLabel={$t('activities.addStudentsAction')}
	busy={busy}
	confirmDisabled={studentIds.length === 0 || !canAddStudents}
	onCancel={() => {
		studentIds = [];
	}}
	onConfirm={confirmAddStudents}
>
	{#if addOpen.open && canAddStudents}
		{#key JSON.stringify([activityId, activitiesPage.scope])}
			<ActivityPupilPicker {activityId} revision={pickerRevision} bind:values={studentIds} />
		{/key}
	{/if}
</PickerModal>

<ConfirmModal
	bind:open={removeOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('activities.removeEnrollmentConfirm', { name: removeStudentName })}
	confirmLabel={$t('activities.removeEnrollment')}
	busy={removeBusy}
	confirmDisabled={!removeTarget}
	onCloseAutoFocus={restoreRosterPosition}
	onConfirm={confirmRemoveEnrollment}
/>

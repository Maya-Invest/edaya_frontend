<script lang="ts">
	import type { ActivityEnrollmentStatus } from '$lib/types/school';
	import { afterNavigate } from '$app/navigation';
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
	import StudentPicker from '$lib/smart-components/student-picker/StudentPicker.svelte';
	import { toast } from '$lib/toast.svelte';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';
	import { getActivitiesPageState } from '../../../activities-page.svelte';
	import { studentDisplayFallback } from '../../../lib/activity-selectors';
	import { getActivityStudentsTabState } from './activity-students-tab.svelte';

	const activitiesPage = getActivitiesPageState();
	const studentsTab = getActivityStudentsTabState();
	const loadTab = studentsTab.query();
	const activityId = $derived($page.params.id ?? '');
	const activity = $derived(activityId ? activitiesPage.findActivity(activityId) : undefined);
	const enrollments = $derived(studentsTab.enrollmentsFor(activityId));

	type ActivityStudentsModal = 'edit' | 'delete' | 'add-students' | 'remove-enrollment';
	const modals = createUrlSyncedModals<ActivityStudentsModal>({
		allowed: ['edit', 'delete', 'add-students', 'remove-enrollment'],
		getUrl: () => $page.url,
	});
	afterNavigate(() => {
		modals.hydrate();
		validateModal();
	});
	const addOpen = bindUrlModal(modals, 'add-students');
	const removeOpen = bindUrlModal(modals, 'remove-enrollment');
	let studentIds = $state<string[]>([]);
	let busy = $state(false);
	let removeBusy = $state(false);

	const enrolledIds = $derived(new Set(enrollments.map(enrollment => enrollment.studentId)));
	const linkedClassGroupIds = $derived(activity?.classEnrollments.map(enrollment => enrollment.classGroupId) ?? []);
	const canAddStudents = $derived(linkedClassGroupIds.length > 0);
	const addStudentsDescription = $derived(
		canAddStudents
			? $t('activities.addStudentsFromLinkedClasses')
			: $t('activities.addStudentsRequiresLinkedClasses'),
	);
	const removeTarget = $derived(
		modals.isOpen('remove-enrollment') && modals.target
			? enrollments.find(enrollment => enrollment.id === modals.target)
			: undefined,
	);
	const removeStudentName = $derived(
		removeTarget
			? (studentsTab.slice?.students.find(student => student.id === removeTarget.studentId)?.name ?? studentDisplayFallback(removeTarget.studentId))
			: '—',
	);

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
			&& !enrollments.some(enrollment => enrollment.id === modals.target)
		) {
			canonicalizeModal(null);
		}
	}

	async function query(url: URL) {
		const result = await loadTab(url);
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

		busy = true;
		await activitiesPage.enrollStudent({
			activityId: activity.id,
			studentId: enrollment.studentId,
			status: ENROLL_NEXT[enrollment.status],
			enrollmentId: enrollment.id,
			successMessage: get(t)('activities.enrollStatusSuccess'),
		});
		studentsTab.syncFromPage(activity.id);
		busy = false;
	}

	async function confirmAddStudents() {
		if (!activity || studentIds.length === 0 || busy) {
			return;
		}

		busy = true;
		let added = 0;
		for (const studentId of studentIds) {
			const ok = await activitiesPage.enrollStudent({
				activityId: activity.id,
				studentId,
				status: 'pending',
			});
			if (ok) {
				added += 1;
			}
		}
		busy = false;
		if (added > 0) {
			toast.success(get(t)('activities.enrollStudentsSuccess', { n: added }));
			studentsTab.syncFromPage(activity.id);
			modals.close();
			studentIds = [];
		}
	}

	async function confirmRemoveEnrollment() {
		if (!activity || !removeTarget || removeBusy) {
			return;
		}

		removeBusy = true;
		const ok = await activitiesPage.removeEnrollment({
			activityId: activity.id,
			enrollmentId: removeTarget.id,
			successMessage: get(t)('activities.removeEnrollmentSuccess'),
		});
		removeBusy = false;
		if (ok) {
			studentsTab.syncFromPage(activity.id);
			modals.close();
		}
	}

</script>

{#if activity}
	<PageQuery {query} cacheKey={drawerTabRouteCacheKey} loadingTitle={$t('activities.enrolledStudents')}>
		{#snippet children(data)}
			<DataState status={data.status} errorMessage={data.errorMessage}>
				<div class="rounded-2xl border border-border bg-card">
					<div class="flex items-center justify-between border-b border-border px-4 py-2.5">
						<p class="font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
							{$t('activities.enrolledStudents')}
						</p>
						<PermissionGate permission="ACTIVITY_ENROLLMENT_MANAGE" mode="disable" tooltip={$t('activities.permissionUpdate')}>
							{#snippet children({ disabled, title })}
								<Button
									size="sm"
									variant="outline"
									class="h-7 rounded-full text-xs"
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
								{@const student = studentsTab.slice?.students.find(student => student.id === enrollment.studentId)}
								{@const classGroup = student ? academicContext.classes.find(entry => entry.id === student.classId) : undefined}
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
													class="h-8 w-8 text-muted-foreground hover:text-destructive"
													disabled={disabled || busy}
													title={$t('activities.removeEnrollment')}
													onclick={() => modals.open('remove-enrollment', { target: enrollment.id })}
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
				</div>
			</DataState>
		{/snippet}
	</PageQuery>
{/if}

<PickerModal
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
	<StudentPicker
		students={(studentsTab.slice?.activityId === activityId ? studentsTab.slice.students : []).filter(student => studentsTab.slice?.eligibleStudentIds.includes(student.id))}
		bind:values={studentIds}
		mode="multi"
		variant="panel"
		active={addOpen.open}
		classGroupIds={linkedClassGroupIds}
		excludeIds={[...enrolledIds]}
	/>
</PickerModal>

<ConfirmModal
	bind:open={removeOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('activities.removeEnrollmentConfirm', { name: removeStudentName })}
	confirmLabel={$t('activities.removeEnrollment')}
	busy={removeBusy}
	onConfirm={confirmRemoveEnrollment}
/>

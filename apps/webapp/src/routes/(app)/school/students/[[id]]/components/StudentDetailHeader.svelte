<script lang="ts">
	import type { ModalUrlBind } from '$lib/modal/modal-state.svelte';
	import type { Student } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import ProfilePhotoPicker from '$lib/components/school/shared/ProfilePhotoPicker.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { getDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { registerVersionInvalidation } from '$lib/navigation/invalidate-on-navigate';
	import { canOpenStudentClassForm, hasPermission } from '$lib/permissions';
	import { getStudentEnrollmentsTabState } from '../(tabs)/enrollments/student-enrollments-tab.svelte';
	import StudentProfileEditModal from '../(tabs)/profile/components/StudentProfileEditModal.svelte';
	import StudentStatusModal from '../(tabs)/profile/components/StudentStatusModal.svelte';
	import { getStudentProfileTabState } from '../(tabs)/profile/student-profile-tab.svelte';
	import ChangeClassButton from './ChangeClassButton.svelte';
	import StudentPlacementHistoryModal from './StudentPlacementHistoryModal.svelte';

	const {
		student,
		editProfileOpen,
		changeClassOpen,
	}: {
		student: Student;
		editProfileOpen: ModalUrlBind<string>;
		changeClassOpen: ModalUrlBind<string>;
	} = $props();

	const profile = getStudentProfileTabState();
	const enrollment = getStudentEnrollmentsTabState();
	const historyQuery = enrollment.query('history');
	registerVersionInvalidation(enrollment);
	const placementStatus = $derived(enrollment.historyStatusFor(student.id));
	const activePlacement = $derived(enrollment.activePlacementFor(student.id));
	const hasHistory = $derived(enrollment.hasPreviousPlacements(student.id));
	const noPlacement = $derived(Boolean(academicContext.yearId) && placementStatus.status === 'ready' && !activePlacement);
	const canTransfer = $derived(Boolean(academicContext.yearId) && canOpenStudentClassForm(student.id, student.classId, noPlacement));
	const modals = getDrawerUrlModals();
	const canManage = $derived(hasPermission('STUDENT_MANAGE', { classId: student.classId, studentId: student.id }));
	const studentClass = $derived(academicContext.classes.find(cl => cl.id === student.classId));
</script>

{#snippet recordActions()}
	{#if canManage}<Button variant="ghost" onclick={() => editProfileOpen.open = true}>{$t('student.editProfile')}</Button>{/if}
	{#if canTransfer}<Button variant="ghost" onclick={() => noPlacement ? modals?.open('change-class', { target: 'assign' }) : changeClassOpen.open = true}>{$t(noPlacement ? 'student.assignClass' : 'student.changeClass')}</Button>{/if}
	{#if canManage}<Button variant="ghost" onclick={() => modals?.open('change-status')}>{$t('student.profile.changeStatus')}</Button>{/if}
	{#if hasHistory}<Button variant="ghost" onclick={() => modals?.open('placement-history')}>{$t('student.placementHistory')}</Button>{/if}
{/snippet}
<div class="ui-student-identity">
	<DrawerEntityHeader
		name={student.name} overflow={canManage || canTransfer || hasHistory ? recordActions : undefined}
	>
		{#snippet avatar()}
			{#key student.id}
				<ProfilePhotoPicker
					name={student.name} initials={student.initials} photoUrl={student.photoUrl}
					size="studentHeader" disabled={!canManage} label={$t('student.photo.replace')}
					onChange={file => profile.updateProfilePhoto({ studentId: student.id, file, successMessage: $t('student.photo.replacedToast') })}
				/>
			{/key}
		{/snippet}
		{#snippet facts()}
			<div class="flex flex-wrap items-center gap-2">
				{#if studentClass && !noPlacement}<span class="text-sm text-muted-foreground">{studentClass.name}</span>{/if}
				<div class="text-sm text-muted-foreground" data-testid="student-placement-date">
					<PageQuery compactLoading query={historyQuery} cache={false} cacheKey={() => `student-placement:${student.id}:${academicContext.yearId}`}>
						<DataState compact {...placementStatus} onRetry={() => void enrollment.retryHistory()}>
							{#if !academicContext.yearId}{$t('academic.selectYear')}
							{:else if activePlacement}
								{activePlacement.enrolledAt ? $t('student.enrolledAt', { date: formatLocaleDate(activePlacement.enrolledAt, $locale, { year: 'numeric', month: 'short', day: 'numeric' }) }) : $t('student.enrollmentDateMissing')}
							{:else}{$t('student.noPlacement')}{/if}
						</DataState>
					</PageQuery>
				</div>
				<span class="rounded bg-secondary px-2 py-1 text-xs font-medium">{$t(`studentStatus.${student.status}`)}</span>
			</div>
			<div class="grid grid-cols-2 gap-x-4 text-sm [overflow-wrap:anywhere]">
				<span><span class="text-xs text-muted-foreground">{$t('profile.identifier')}:</span> {student.identifier || $t('profile.notProvided')}</span>
				<span><span class="text-xs text-muted-foreground">{$t('profile.globalIdentifier')}:</span> {student.globalIdentifier || $t('profile.notProvided')}</span>
			</div>
		{/snippet}
	</DrawerEntityHeader>
</div>

{#if canManage}<StudentProfileEditModal s={student} bind:open={editProfileOpen.open} />{/if}
{#if changeClassOpen.open && canOpenStudentClassForm(student.id, student.classId, modals?.target === 'assign')}{#key JSON.stringify([student.id, academicContext.yearId])}<ChangeClassButton s={student} bind:open={changeClassOpen.open} />{/key}{/if}
<StudentStatusModal s={student} open={modals?.active === 'change-status' && canManage} onClose={() => modals?.close()} />

{#if modals?.active === 'placement-history'}<StudentPlacementHistoryModal {student} onClose={() => modals?.close()} />{/if}

<script lang="ts">
	import type { Evaluation } from '$lib/types/school';
	import { page } from '$app/stores';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import RowActionMenuItem from '$lib/components/ui/RowActionMenuItem.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { locale, t } from '$lib/i18n';
	import { setDrawerUrlModals } from '$lib/modal/drawer-url-modals.svelte';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { openRouteSurface } from '$lib/navigation/route-surface-navigation';
	import { hasPermission } from '$lib/permissions';
	import { get } from 'svelte/store';
	import EvaluationCreateModal from '../../components/EvaluationCreateModal.svelte';
	import { getEvaluationsPageState } from '../../evaluations-page.svelte';
	import { gradingTaskHref } from '../../lib/grading-task';

	const { classId, evaluation, onDeleted }: {
		classId: string;
		evaluation: Evaluation;
		onDeleted?: () => void;
	} = $props();
	type EvaluationDrawerModal = 'edit' | 'delete' | 'submit-marks' | 'approve-marks' | 'return-marks';
	const evaluationsPage = getEvaluationsPageState();
	const modals = createUrlSyncedModals<EvaluationDrawerModal>({
		allowed: ['edit', 'delete', 'submit-marks', 'approve-marks', 'return-marks'],
		getUrl: () => $page.url,
	});
	setDrawerUrlModals(modals);
	$effect(() => {
		modals.hydrate();
	});
	const editOpen = bindUrlModal(modals, 'edit');
	const deleteOpen = bindUrlModal(modals, 'delete');
	const isHomework = $derived(evaluation.kind === 'homework');
	const formattedDate = $derived(evaluation.date
		? formatLocaleDate(evaluation.date, $locale, {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		})
		: '-');
	let deleteBusy = $state(false);
	const canManage = $derived(hasPermission('ASSESSMENT_MANAGE', { classId, subject: evaluation.classSubjectId, subjectId: evaluationsPage.subjectsFor(classId).find(row => row.id === evaluation.classSubjectId)?.subjectId, assessmentId: evaluation.id }));
	let completeBusy = $state(false);
	async function complete() {
		if (!canManage || completeBusy)
			return;
		completeBusy = true;
		try {
			await evaluationsPage.completeEvaluation(evaluation.id);
		}
		finally {
			completeBusy = false;
		}
	}
	async function confirmDelete() {
		if (!canManage)
			return;
		deleteBusy = true;
		try {
			const ok = await evaluationsPage.deleteEvaluation({
				assessmentId: evaluation.id,
				successMessage: get(t)('eval.toastDeleted', { title: evaluation.title }),
			});
			if (ok) {
				deleteOpen.open = false;
				onDeleted?.();
			}
		}
		finally {
			deleteBusy = false;
		}
	}
</script>

<DrawerEntityHeader name={evaluation.title} summary="{evaluation.subject} - {formattedDate}">
	{#snippet chips()}
		<span
			class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
		>
			{$t(`eval.kind.${evaluation.kind}`)}
		</span>
	{/snippet}
	{#snippet actions()}
		{#if evaluationsPage.canEnterMarks(evaluation.id)}
			<Button variant="outline" disabled={evaluation.marksStatus !== 'draft'} title={evaluation.marksStatus === 'submitted' ? $t('gradeTask.frozen') : evaluation.marksStatus !== 'draft' ? $t('dataState.unavailable') : undefined} onclick={() => openRouteSurface(gradingTaskHref($page.url, classId, evaluation.id, 'entry'), `${$page.url.pathname}${$page.url.search}`)}>{$t('gradeTask.title')}</Button>
		{/if}
		<PermissionGate permission="ASSESSMENT_MANAGE" {classId} subject={evaluation.classSubjectId} subjectId={evaluationsPage.subjectsFor(classId).find(row => row.id === evaluation.classSubjectId)?.subjectId} assessmentId={evaluation.id} mode="disable" tooltip={$t('eval.permissionCreate')}>
			{#snippet children({ disabled, title })}
				{#if isHomework}
					<Button variant="outline" size="sm" {disabled} {title} onclick={() => (editOpen.open = true)}>
						{$t('common.edit')}
					</Button>
				{/if}
			{/snippet}
		</PermissionGate>
	{/snippet}
	{#snippet overflow()}
		<PermissionGate permission="ASSESSMENT_MANAGE" {classId} subject={evaluation.classSubjectId} subjectId={evaluationsPage.subjectsFor(classId).find(row => row.id === evaluation.classSubjectId)?.subjectId} assessmentId={evaluation.id} mode="disable" tooltip={$t('eval.permissionCreate')}>
			{#snippet children({ disabled, title })}
				<RowActionMenuItem
					{disabled}
					{title}
					onclick={() => (editOpen.open = true)}
				>
					{$t('common.edit')}
				</RowActionMenuItem>
				{#if !evaluation.completedAt}<RowActionMenuItem disabled={disabled || completeBusy} onclick={complete}>{$t('profile.completeAssessment')}</RowActionMenuItem>{/if}
				<RowActionMenuItem
					destructive
					{disabled}
					{title}
					onclick={() => (deleteOpen.open = true)}
				>
					{$t('common.delete')}
				</RowActionMenuItem>
			{/snippet}
		</PermissionGate>
	{/snippet}
</DrawerEntityHeader>
{#if evaluation.completedAt}<p class="mb-3 text-xs text-muted-foreground">{$t('profile.completedAt')}: {formatLocaleDate(evaluation.completedAt, $locale, { year: 'numeric', month: 'short', day: 'numeric' })}</p>{/if}

<EvaluationCreateModal evaluation={evaluation} {classId} bind:open={editOpen.open} />

<ConfirmModal
	bind:open={deleteOpen.open}
	title={$t('common.deleteConfirmTitle')}
	description={$t('eval.deleteConfirm', { title: evaluation.title })}
	confirmLabel={$t('common.delete')}
	cancelLabel={$t('common.cancel')}
	busy={deleteBusy}
	confirmDisabled={!canManage}
	onConfirm={confirmDelete}
/>

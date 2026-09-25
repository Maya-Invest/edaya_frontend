<script lang="ts">
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { getEvaluationsPageState } from '../../../../evaluations-page.svelte';
	import { getEvaluationGradingTabState } from '../evaluation-grading-tab.svelte';

	const pageState = getEvaluationsPageState();
	const grading = getEvaluationGradingTabState();
	const modals = createUrlSyncedModals<'edit' | 'delete' | 'submit-marks' | 'approve-marks' | 'return-marks'>({ allowed: ['edit', 'delete', 'submit-marks', 'approve-marks', 'return-marks'], getUrl: () => $page.url });
	$effect(() => {
		modals.hydrate();
	});
	const submit = bindUrlModal(modals, 'submit-marks');
	const approve = bindUrlModal(modals, 'approve-marks');
	const reopen = bindUrlModal(modals, 'return-marks');
	let reason = $state('');
	let busy = $state(false);
	async function confirm(action: 'submit' | 'approve' | 'return') {
		busy = true;
		try {
			if (await pageState.reviewMarks(action, reason)) {
				submit.open = false;
				approve.open = false;
				reopen.open = false;
			}
		}
		finally { busy = false; }
	}
</script>
{#if grading.review}
	<section class="space-y-3 p-4">
		<p>{$t('marks.status', { state: $t(`marks.${grading.review.assessment.marksStatus}`), revision: String(grading.review.assessment.marksRevision) })}</p>
		<p>{$t('marks.incomplete', { count: String(grading.review.missingStudentIds.length) })}</p>
		{#each grading.review.assessment.marksReview.history.filter(event => event.action === 'return').slice(-1) as event (event.revision)}<p>{$t('marks.returnReason', { reason: event.reason ?? '' })}</p>{/each}
		<div class="flex flex-wrap gap-2">
			{#if grading.review.allowedActions.submit}<Button onclick={() => submit.open = true}>{$t('marks.submit')}</Button>{/if}
			{#if grading.review.allowedActions.approve}<Button onclick={() => approve.open = true}>{$t('marks.approve')}</Button>{/if}
			{#if grading.review.allowedActions.return}<Button variant="outline" onclick={() => reopen.open = true}>{$t('marks.return')}</Button>{/if}
		</div>
	</section>
{/if}
<FormModal bind:open={submit.open} title={$t('marks.submit')} {busy} onSubmit={() => confirm('submit')}><p>{$t('marks.submitHint')}</p></FormModal>
<FormModal bind:open={approve.open} title={$t('marks.approve')} {busy} onSubmit={() => confirm('approve')}><p>{$t('marks.approveHint')}</p></FormModal>
<FormModal bind:open={reopen.open} submitDisabled={!reason.trim()} title={$t('marks.return')} {busy} onSubmit={() => confirm('return')}><Textarea bind:value={reason} required aria-label={$t('marks.reasonRequired')} /></FormModal>

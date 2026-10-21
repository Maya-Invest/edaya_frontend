<script lang="ts">
	import type { PageQueryRequest } from '$lib/queries/page-status';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import PageQuery from '$lib/components/ui/PageQuery.svelte';
	import { t } from '$lib/i18n';
	import { createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { hasPermission } from '$lib/permissions';
	import { AttendanceReviewState } from './attendance-review-state.svelte';

	const { recordId, classId, onSaved }: {
		recordId: string;
		classId: string;
		onSaved?: () => void | Promise<void>;
	} = $props();
	const review = new AttendanceReviewState();
	const modals = createUrlSyncedModals({ allowed: ['attendance-review'], getUrl: () => $page.url });
	const open = $derived(modals.active === 'attendance-review' && modals.target === recordId);
	const canValidate = $derived(hasPermission('ATTENDANCE_VALIDATE', { classId }));
	const reviewed = $derived(review.record?.justificationStatus === 'excused' || review.record?.justificationStatus === 'rejected');
	let decision = $state<'excused' | 'rejected'>('excused');
	let reason = $state('');
	let notes = $state('');
	let initialized = $state('');
	const query = (url: URL, request: PageQueryRequest | undefined = undefined) => review.query(recordId, url, request);
	$effect(() => modals.hydrate());
	$effect(() => {
		if (open && review.record?.id === recordId && initialized !== recordId) {
			initialized = recordId;
			decision = review.record.justificationStatus === 'rejected' ? 'rejected' : 'excused';
			reason = review.record.reason ?? '';
			notes = review.record.notes ?? '';
		}
		if (!open)
			initialized = '';
	});
	async function save() {
		if (canValidate && !reviewed && reason.trim() && await review.save(decision, reason, notes)) {
			modals.close();
			await onSaved?.();
		}
	}
</script>
<Button variant="ghost" size="sm" onclick={() => modals.open('attendance-review', { target: recordId })}>{$t('profile.justification')}</Button>
<FormModal {open} onOpenChange={(value) => {
	if (!value && open)
		modals.close();
}} title={$t('profile.justification')} submitLabel={$t('common.save')} busy={review.busy} submitDisabled={!canValidate || reviewed || !reason.trim() || review.record?.status === 'present' || review.record?.id !== recordId} onSubmit={save}>
	{#if open}<PageQuery cache={false} {query} cacheKey={() => recordId} loadingTitle={$t('profile.justification')}>
		{#snippet children(data)}{#if data.status === 'error'}<p role="alert">{data.errorMessage}</p>{:else if review.record?.id === recordId}
			<div class="space-y-2 text-sm"><p>{$t('common.status')}: {$t(`profile.justificationStatus.${review.record.justificationStatus}`)}</p><p>{$t('profile.reviewedAt')}: {String(review.record.justifiedAt ?? $t('profile.notProvided'))}</p><p>{$t('profile.reviewedBy')}: {review.record.justifiedByStaffId ?? $t('profile.notProvided')}</p>{#if review.record.correctedAt}<p>{$t('profile.correctedAt')}: {String(review.record.correctedAt)} · {review.record.correctedByStaffId}</p>{/if}</div>
			<label>{$t('profile.decision')}<select bind:value={decision} disabled={!canValidate || reviewed} class="h-10 w-full rounded-lg border bg-background px-3"><option value="excused">{$t('profile.justificationStatus.excused')}</option><option value="rejected">{$t('profile.justificationStatus.rejected')}</option></select></label>
			<label>{$t('profile.reason')}<textarea bind:value={reason} disabled={!canValidate || reviewed} class="min-h-20 w-full rounded-lg border bg-background p-3"></textarea></label>
			<label>{$t('profile.notes')}<textarea bind:value={notes} disabled={!canValidate || reviewed} class="min-h-20 w-full rounded-lg border bg-background p-3"></textarea></label>
		{/if}{/snippet}
	</PageQuery>{/if}
</FormModal>

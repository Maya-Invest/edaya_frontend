<script lang="ts">
	import type { writeReportSectionCommentsMutation } from '$lib/api/mutations/student-ops.mutations';
	import type { ReportCardResult, ReportCommentSection } from '$lib/types/report-cards';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';

	const {
		onWriteReportSectionComments,
		result,
		onSaved,
		canEdit = true,
	}: {
		onWriteReportSectionComments: typeof writeReportSectionCommentsMutation;
		result: ReportCardResult;
		canEdit?: boolean;
		onSaved: (sections: ReportCommentSection[], version: number) => void | Promise<void>;
	} = $props();
	const modals = createUrlSyncedModals<'report-comments'>({ allowed: ['report-comments'], getUrl: () => $page.url });
	const modal = bindUrlModal(modals, 'report-comments');
	let drafts = $state<ReportCommentSection[]>([]);
	let version = $state(0);
	let busy = $state(false);
	let lastInput = '';
	let requestId = '';
	$effect(() => {
		modals.hydrate();
	});
	$effect(() => {
		if (modal.open) {
			untrack(() => {
				drafts = (result.commentSections ?? []).map(section => ({ ...section }));
				version = result.version ?? 0;
			});
		}
	});
	async function save() {
		const key = JSON.stringify([result.id, version, drafts]);
		if (key !== lastInput) {
			lastInput = key;
			requestId = crypto.randomUUID();
		}
		busy = true;
		try {
			const ok = await onWriteReportSectionComments({ requestId, resultId: result.id, expectedVersion: version, sections: drafts.map(section => ({ sectionId: section.sectionId, comment: section.comment.trim() || null })), successMessage: get(t)('reportCards.homeroomCommentSaved') });
			if (ok) {
				modal.open = false;
				await onSaved(drafts, version + 1);
			}
		}
		finally { busy = false; }
	}
</script>

<section class="space-y-3">
	{#if result.pendingAssessmentIds?.length}
		<p role="status" class="text-sm text-muted-foreground">{$t('reportCards.pendingApprovals', { count: String(result.pendingAssessmentIds.length) })}</p>
	{/if}
	{#each result.commentSections ?? [] as section (section.sectionId)}
		{#if section.comment}<p class="text-sm"><strong>{section.name}</strong> — {section.comment}</p>{/if}
	{/each}
	{#if canEdit && result.status !== 'published' && result.commentSections?.length}
		<Button variant="outline" size="sm" onclick={() => modal.open = true}>{$t('reportCards.sectionComments')}</Button>
	{/if}
</section>
<FormModal bind:open={modal.open} title={$t('reportCards.sectionComments')} {busy} onSubmit={save}>
	<div class="space-y-4">
		{#each drafts as section (section.sectionId)}
			<label class="block space-y-2"><span>{section.name}</span><Textarea bind:value={section.comment} rows={3} /></label>
		{/each}
	</div>
</FormModal>

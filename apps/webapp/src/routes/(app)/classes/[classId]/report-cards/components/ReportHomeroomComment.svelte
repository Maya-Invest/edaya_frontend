<script lang="ts">
	import type { ReportCardResult } from '$lib/types/report-cards';

	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';

	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { bindUrlModal, createUrlSyncedModals } from '$lib/modal/modal-state.svelte';
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getReportCardsPageState } from '../report-cards-page.svelte';

	const actionState = getReportCardsPageState();

	const { result, onSaved }: { result: ReportCardResult; onSaved: (comment: string, version: number) => void } = $props();
	const modals = createUrlSyncedModals<'homeroom-comment'>({ allowed: ['homeroom-comment'], getUrl: () => $page.url });
	const modal = bindUrlModal(modals, 'homeroom-comment');
	let draft = $state('');
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
				draft = result.homeroomComment ?? '';
				version = result.version ?? 0;
			});
		}
	});
	async function save() {
		const key = JSON.stringify([result.id, version, draft.trim()]);
		if (key !== lastInput) {
			lastInput = key;
			requestId = crypto.randomUUID();
		}
		busy = true;
		try {
			const ok = await actionState.performWriteHomeroomReportComment({ requestId, resultId: result.id, expectedVersion: version, teacherComment: draft, successMessage: get(t)('reportCards.homeroomCommentSaved') });
			if (ok) {
				onSaved(draft.trim(), version + 1);
				modal.open = false;
			}
		}
		finally { busy = false; }
	}
</script>
<section class="rounded-collection border border-border bg-card p-4 space-y-2">
	<p class="text-sm font-semibold">{$t('reportCards.homeroomComment')}</p>
	<p class="whitespace-pre-wrap text-sm">{result.homeroomComment || '—'}</p>
	{#if result.status !== 'published'}
		<Button variant="outline" size="sm" onclick={() => modal.open = true}>{$t('common.edit')}</Button>
	{/if}
</section>
<FormModal bind:open={modal.open} title={$t('reportCards.homeroomComment')} {busy} onSubmit={save}>
	<Textarea bind:value={draft} rows={4} aria-label={$t('reportCards.homeroomComment')} />
</FormModal>

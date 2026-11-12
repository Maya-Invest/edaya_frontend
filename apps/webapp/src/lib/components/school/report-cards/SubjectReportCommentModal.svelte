<script lang="ts">
	import type { writeReportSectionCommentsMutation } from '$lib/api/mutations/student-ops.mutations';
	import type { ReportCardResult } from '$lib/types/report-cards';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { untrack } from 'svelte';

	let { open = $bindable(false), result, sectionId, canEdit, onSave, onSaved }: {
		open?: boolean;
		result: ReportCardResult;
		sectionId: string;
		canEdit: boolean;
		onSave: typeof writeReportSectionCommentsMutation;
		onSaved: () => Promise<void>;
	} = $props();
	const subject = $derived(result.sectionResults.flatMap(section => section.marks).find(mark => mark.sectionId === sectionId));
	const editable = $derived(canEdit && result.status !== 'published' && Boolean(subject));
	let draft = $state('');
	let original = $state('');
	let version = $state(0);
	let busy = $state(false);
	let failed = $state(false);
	let initialized = '';
	let requestId = '';
	let lastInput = '';
	let returnSection = '';
	$effect(() => {
		const identity = `${open}:${result.id}:${sectionId}`;
		if (identity === initialized)
			return;
		initialized = identity;
		if (open) {
			untrack(() => {
				draft = subject?.comment ?? '';
				original = draft;
				version = result.version ?? 0;
				failed = false;
				returnSection = sectionId;
			});
		}
	});
	async function save() {
		if (!editable || busy)
			return;
		const input = { resultId: result.id, expectedVersion: version, sections: [{ sectionId, comment: draft.trim() || null }] };
		const key = JSON.stringify(input);
		if (lastInput !== key) {
			requestId = crypto.randomUUID();
			lastInput = key;
		}
		busy = true;
		try {
			if (await onSave({ ...input, requestId })) {
				original = draft;
				await onSaved();
				open = false;
			}
			else {
				failed = true;
			}
		}
		finally { busy = false; }
	}
	function restoreFocus(event: Event) {
		const trigger = document.getElementById(`report-subject-${returnSection}`)?.querySelector<HTMLButtonElement>('button');
		if (trigger) {
			event.preventDefault();
			trigger.focus();
		}
	}
</script>

<FormModal bind:open title={`${$t('reportCards.subjectComment')}${subject ? ` · ${subject.subjectName}` : ''}`} {busy} dirty={draft !== original} submitDisabled={!editable} onSubmit={save}
	onCloseAutoFocus={restoreFocus}>
	{#if editable}
		<label class="block space-y-2"><span>{$t('reportCards.subjectComment')}</span><Textarea bind:value={draft} rows={5} /></label>
		{#if failed}<p role="alert" class="text-sm text-destructive">{$t('reportCards.commentSaveFailed')}</p>{/if}
	{:else}<p role="status">{$t('form.targetUnavailable')}</p>{/if}
</FormModal>

<script lang="ts">
	import type { DocumentTemplateKey } from '$lib/api/documents-types';
	import { CONVOCATION_TEMPLATE } from '$lib/api/documents-types';

	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { lang, t } from '$lib/i18n';
	import { getStudentDocumentsTabState } from '../student-documents-tab.svelte';

	let {
		open = $bindable(false),
		studentId,
		templateKey,
	}: {
		open?: boolean;
		studentId: string;
		templateKey: DocumentTemplateKey;
	} = $props();

	const documentsTab = getStudentDocumentsTabState();
	const templates = $derived(documentsTab.generateTemplatesFor(studentId));

	let recipient = $state('');
	let date = $state('');
	let location = $state('');
	let reason = $state('');
	let busy = $state(false);

	const selected = $derived(templates.find(entry => entry.templateKey === templateKey));
	const isConvocation = $derived(templateKey === CONVOCATION_TEMPLATE);
	const sourceId = $derived(documentsTab.resolveSourceId(studentId, templateKey));
	const selectedLabel = $derived(
		selected ? ($lang === 'en' ? selected.titles.en : selected.titles.fr) : '',
	);
	const canSubmit = $derived(Boolean(sourceId) && (!isConvocation || (recipient.trim() && date.trim() && location.trim() && reason.trim())));

	async function submit() {
		if (!sourceId || !canSubmit || busy) {
			return;
		}
		busy = true;
		try {
			const result = await documentsTab.performRequestDocumentIssuance({
				templateKey,
				sourceId,
				studentId,
				staffFields: isConvocation
					? { recipient: recipient.trim(), date: date.trim(), location: location.trim(), reason: reason.trim() }
					: undefined,
				successMessage: $t('documents.toastRequested'),
			});
			if (result) {
				open = false;
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('documents.generateTitle')}
	description={$t('documents.generateSelectedDescription')}
	submitLabel={$t('documents.generatePdf')}
	cancelLabel={$t('common.cancel')}
	{busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<div class="space-y-4">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('documents.template')}
			</Label>
			<p>{selectedLabel}</p>
		</div>
		{#if !sourceId}
			<p class="text-xs text-destructive">{$t('documents.sourceMissing')}</p>
		{/if}
		{#if isConvocation}
			<div class="space-y-1.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('documents.recipient')}
				</Label>
				<Input bind:value={recipient} />
			</div>
			<div class="space-y-1.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('documents.date')}
				</Label>
				<Input type="date" bind:value={date} />
			</div>
			<div class="space-y-1.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('documents.location')}
				</Label>
				<Input bind:value={location} />
			</div>
			<div class="space-y-1.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('documents.reason')}
				</Label>
				<Input bind:value={reason} />
			</div>
		{/if}
		<p class="text-xs text-muted-foreground">{$t('documents.downloadRecall')}</p>
	</div>
</FormModal>

<script lang="ts">
	import type { DocumentTemplateKey } from '$lib/api/documents-types';
	import { CONVOCATION_TEMPLATE } from '$lib/api/documents-types';
	import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { lang, t } from '$lib/i18n';
	import { getStudentDocumentsTabState } from '../student-documents-tab.svelte';

	let {
		open = $bindable(false),
		studentId,
	}: {
		open?: boolean;
		studentId: string;
	} = $props();

	const documentsTab = getStudentDocumentsTabState();
	const templates = $derived(documentsTab.generateTemplatesFor(studentId));

	let templateKey = $state<DocumentTemplateKey>('schooling-certificate.v1');
	let recipient = $state('');
	let date = $state('');
	let location = $state('');
	let reason = $state('');
	let busy = $state(false);

	const selected = $derived(templates.find(entry => entry.templateKey === templateKey) ?? templates[0]);
	const isConvocation = $derived((selected?.templateKey ?? templateKey) === CONVOCATION_TEMPLATE);
	const sourceId = $derived(documentsTab.resolveSourceId(studentId, selected?.templateKey ?? templateKey));
	const selectedLabel = $derived(
		selected ? ($lang === 'en' ? selected.titles.en : selected.titles.fr) : '',
	);
	const canSubmit = $derived(Boolean(sourceId) && (!isConvocation || (recipient.trim() && date.trim() && location.trim() && reason.trim())));

	$effect(() => {
		if (open && templates.length > 0 && !templates.some(entry => entry.templateKey === templateKey)) {
			templateKey = templates[0].templateKey;
		}
	});

	async function submit() {
		if (!sourceId || !canSubmit || busy) {
			return;
		}
		busy = true;
		try {
			const result = await requestDocumentIssuanceMutation({
				templateKey: selected?.templateKey ?? templateKey,
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
	description={$t('documents.generateDescription')}
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
			<Select.Root type="single" value={templateKey} onValueChange={v => v && (templateKey = v as DocumentTemplateKey)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('documents.templatePlaceholder')}>
						{selectedLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each templates as template (template.templateKey)}
						<Select.Item value={template.templateKey} label={$lang === 'en' ? template.titles.en : template.titles.fr}>
							{$lang === 'en' ? template.titles.en : template.titles.fr}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
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

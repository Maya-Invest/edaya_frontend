<script lang="ts">
	import type { DocumentTemplateKey } from '$lib/api/documents-types';
	import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { lang, t } from '$lib/i18n';
	import { getTeacherDocumentsTabState } from '../teacher-documents-tab.svelte';

	let {
		open = $bindable(false),
		teacherId,
	}: {
		open?: boolean;
		teacherId: string;
	} = $props();

	const documentsTab = getTeacherDocumentsTabState();
	const templates = $derived(documentsTab.generateTemplatesFor(teacherId));

	let templateKey = $state<DocumentTemplateKey>('teacher-timetable.v1');
	let busy = $state(false);

	const selected = $derived(templates.find(entry => entry.templateKey === templateKey) ?? templates[0]);
	const selectedLabel = $derived(
		selected ? ($lang === 'en' ? selected.titles.en : selected.titles.fr) : '',
	);
	const canSubmit = $derived(Boolean(teacherId) && Boolean(selected));

	$effect(() => {
		if (open && templates.length > 0 && !templates.some(entry => entry.templateKey === templateKey)) {
			templateKey = templates[0].templateKey;
		}
	});

	async function submit() {
		if (!canSubmit || busy) {
			return;
		}
		busy = true;
		try {
			const result = await requestDocumentIssuanceMutation({
				templateKey: selected?.templateKey ?? templateKey,
				sourceId: teacherId,
				teacherId,
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
		<p class="text-xs text-muted-foreground">{$t('documents.downloadRecall')}</p>
	</div>
</FormModal>

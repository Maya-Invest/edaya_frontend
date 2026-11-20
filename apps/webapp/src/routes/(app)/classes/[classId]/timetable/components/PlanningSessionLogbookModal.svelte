<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { SessionDetail, LogbookSave } from '$lib/types/session-detail';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';

	let {
		detail,
		disabled = false,
		title,
		open = $bindable(false),
		showTrigger = true,
		onLoad,
		onSave,
	}: {
		detail: SessionDetail;
		disabled?: boolean;
		title?: string;
		open?: boolean;
		showTrigger?: boolean;
		onLoad: (id: string) => Promise<components['schemas']['TeacherWorkflowEligibilityResponse'] & { editable: boolean }>;
		onSave: (input: LogbookSave) => Promise<boolean>;
	} = $props();
	let busy = $state(false);
	let loaded = $state(false);
	let error = $state('');
	let content = $state('');
	let reason = $state('');
	let locked = $state(false);
	let expectedVersion = 0;
	let correctionId: string | undefined;
	let envelope: { edayaLogbook: { content?: string } } | undefined;
	let selected = $state<Record<string, { completed: boolean; notes: string }>>({});
	let lastBody = '';
	let requestId = '';
	const isEdit = $derived(detail.logbook !== undefined);
	const canSubmit = $derived(loaded && (!locked || !!reason.trim()));

	$effect(() => {
		if (!open)
			return;
		let active = true;
		loaded = false;
		error = '';
		const targetId = detail.sessionId;
		onLoad(targetId).then((state) => {
			if (!active || state.official.workflow !== 'logbook')
				return;
			if (!state.editable) {
				error = $t('logbook.otherAuthor');
				return;
			}
			const pending = state.corrections.find(row => row.status === 'pending');
			const source = pending?.proposal.workflow === 'logbook' ? pending.proposal : state.official;
			locked = state.locked;
			expectedVersion = pending?.version ?? state.version;
			correctionId = pending?.id;
			reason = pending?.reason ?? '';
			content = source.sessionNote ?? '';
			envelope = undefined;
			try {
				const parsed = JSON.parse(content);
				if (parsed?.edayaLogbook && typeof parsed.edayaLogbook === 'object') {
					envelope = parsed;
					content = parsed.edayaLogbook.content ?? '';
				}
			}
			catch { /* Plain text lesson note. */ }
			selected = Object.fromEntries(source.progress.map(row => [row.matterId, { completed: row.completed, notes: row.notes ?? '' }]));
			lastBody = '';
			loaded = true;
		}).catch((cause) => {
			if (active)
				error = String(cause);
		});
		return () => {
			active = false;
		};
	});

	async function submit() {
		if (!canSubmit || busy)
			return;
		busy = true;
		try {
			const sessionNote = envelope ? JSON.stringify({ ...envelope, edayaLogbook: { ...envelope.edayaLogbook, content } }) : content.trim() || null;
			const progress = Object.entries(selected).map(([matterId, row]) => ({ matterId, completed: row.completed, notes: row.notes.trim() || null }));
			const body = { sessionId: detail.sessionId, expectedVersion, sessionNote, progress, reason: locked ? reason.trim() : undefined, correctionId };
			const key = JSON.stringify(body);
			if (lastBody !== key) {
				requestId = crypto.randomUUID();
				lastBody = key;
			}
			if (await onSave({ ...body, requestId }))
				open = false;
		}
		finally { busy = false; }
	}
</script>

{#if showTrigger}
	<Button
		variant="ghost"
		class={isEdit ? 'h-7 rounded-full px-2 text-[11px]' : 'w-full rounded-full border border-dashed border-border'}
		{disabled}
		{title}
		onclick={() => (open = true)}
	>
		{#if isEdit}
			{$t('common.edit')}
		{:else}
			<Plus class="mr-1 h-4 w-4" />
			{$t('planning.session.addLogbook')}
		{/if}
	</Button>
{/if}

<FormModal
	bind:open
	title={isEdit ? $t('planning.session.editLogbookTitle') : $t('planning.session.addLogbookTitle')}
	description={$t('planning.session.logbookDescription')}
	submitLabel={isEdit ? $t('common.save') : $t('planning.session.addLogbook')}
	{busy}
	submitDisabled={!canSubmit}
	onCancel={() => { open = false; }}
	onSubmit={submit}
>
	{#if error}<p role="alert">{error}</p>{/if}
	{#if loaded}
		<Label>{$t('planning.session.logbookContent')}<Textarea bind:value={content} rows={4} /></Label>
		<fieldset class="space-y-3"><legend>{$t('planning.session.logbookSubjectMatter')}</legend>
			{#each detail.subjectMatters as matter (matter.id)}
				<div class="space-y-2">
					<label><input type="checkbox" checked={!!selected[matter.id]} onchange={(event) => {
						if (event.currentTarget.checked)
							selected[matter.id] = { completed: false, notes: '' };
						else delete selected[matter.id];
					}} /> {matter.name}</label>
					{#if selected[matter.id]}
						<label class="block"><input type="checkbox" bind:checked={selected[matter.id].completed} /> {$t('logbook.finished')}</label>
						<Label>{$t('planning.session.logbookNotes')}<Textarea bind:value={selected[matter.id].notes} rows={2} /></Label>
					{/if}
				</div>
			{/each}
		</fieldset>
		{#if locked}<Label>{$t('logbook.reason')}<Textarea bind:value={reason} rows={2} /></Label>{/if}
	{/if}
</FormModal>

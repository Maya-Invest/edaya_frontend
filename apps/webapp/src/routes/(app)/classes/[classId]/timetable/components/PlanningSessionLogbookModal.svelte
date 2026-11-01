<script lang="ts">
	import type { SessionDetail } from '$lib/types/session-detail';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import Textarea from '$lib/components/ui/textarea/textarea.svelte';
	import { t } from '$lib/i18n';
	import { Plus } from '$lib/icons';
	import { get } from 'svelte/store';

	let {
		detail,
		disabled = false,
		title,
		open = $bindable(false),
		showTrigger = true,
		onSave,
	}: {
		detail: SessionDetail;
		disabled?: boolean;
		title?: string;
		open?: boolean;
		showTrigger?: boolean;
		onSave: (input: {
			sessionId: string;
			classGroupId: string;
			classSubjectId: string;
			date: string;
			logbookId?: string;
			classSubjectMatterId: string;
			chapter: string;
			content: string;
			notes: string;
			progress: number;
			successMessage?: string;
		}) => Promise<boolean>;
	} = $props();
	let busy = $state(false);
	let wasOpen = $state(false);
	let classSubjectMatterId = $state('');
	let content = $state('');
	let notes = $state('');
	let progress = $state('0');

	const isEdit = $derived(detail.logbook !== undefined);
	const subjectMatters = $derived(detail.subjectMatters);
	const selectedMatter = $derived(subjectMatters.find(entry => entry.id === classSubjectMatterId));
	const selectedMatterLabel = $derived(selectedMatter?.name ?? '');
	const canSubmit = $derived(
		classSubjectMatterId.length > 0 && content.trim().length > 0	&& detail.classSubjectId.length > 0 && subjectMatters.length > 0,
	);

	function resolveInitialMatterId(): string {
		if (detail.logbook) {
			const matched = subjectMatters.find(entry => entry.id === detail.logbook?.chapter || entry.name === detail.logbook?.chapter);
			if (matched) {
				return matched.id;
			}
		}
		return subjectMatters[0]?.id ?? '';
	}

	function resetForm() {
		classSubjectMatterId = resolveInitialMatterId();
		content = detail.logbook?.content ?? '';
		notes = detail.logbook?.notes ?? '';
		progress = String(
			detail.logbook?.progress ?? subjectMatters.find(entry => entry.id === classSubjectMatterId)?.completedPercentage ?? 0,
		);
	}

	function handleMatterChange(value: string | undefined) {
		if (!value) {
			return;
		}
		classSubjectMatterId = value;
		const matter = subjectMatters.find(entry => entry.id === value);
		if (matter && !isEdit) {
			progress = String(matter.completedPercentage);
		}
	}

	$effect(() => {
		if (open && !wasOpen)
			resetForm();
		wasOpen = open;
	});

	async function submit() {
		if (!canSubmit || !selectedMatter)
			return;

		busy = true;
		const input = {
			sessionId: detail.sessionId,
			classGroupId: detail.classGroupId,
			classSubjectId: detail.classSubjectId,
			classSubjectMatterId,
			date: detail.date,
			logbookId: detail.logbook?.id,
			chapter: selectedMatter.name,
			content,
			notes,
			progress: Math.max(0, Math.min(100, Number.parseInt(progress, 10) || 0)),
			successMessage: get(t)('planning.session.logbookSuccess'),
		};
		const ok = await onSave(input);
		busy = false;
		if (ok) {
			open = false;
		}
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
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('planning.session.logbookSubjectMatter')}
		</Label>
		{#if subjectMatters.length === 0}
			<p class="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
				{$t('planning.session.noSubjectMatters')}
			</p>
		{:else}
			<Select.Root type="single" value={classSubjectMatterId} onValueChange={handleMatterChange}>
				<Select.Trigger>
					<Select.Value placeholder={$t('planning.session.logbookSubjectMatter')}>
						{selectedMatterLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each subjectMatters as matter (matter.id)}
						<Select.Item value={matter.id} label={matter.name}>
							{matter.name}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{/if}
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('planning.session.logbookContent')}
		</Label>
		<Textarea bind:value={content} rows={4} />
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('planning.session.logbookNotes')}
		</Label>
		<Textarea bind:value={notes} rows={3} />
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('planning.session.logbookProgress')}
		</Label>
		<Input type="number" min="0" max="100" bind:value={progress} />
	</div>
</FormModal>

<script lang="ts">
	import type { SubjectMatterDrawerRow, saveSubjectMatterMutation } from '$lib/api/mutations/subject-matter.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	let {
		onSaveSubjectMatter,
		open = $bindable(false),
		matter = null,
		subjectId,
		classSubjectId,
		classGroupId,
		gradeLevelSubjectId,
		defaultSequenceOrder = 1,
		onSaved,
	}: {
		onSaveSubjectMatter: typeof saveSubjectMatterMutation;
		open?: boolean;
		matter?: SubjectMatterDrawerRow | null;
		subjectId: string;
		classSubjectId: string;
		classGroupId: string;
		gradeLevelSubjectId?: string;
		defaultSequenceOrder?: number;
		onSaved?: (row: SubjectMatterDrawerRow) => void;
	} = $props();

	let busy = $state(false);
	let name = $state('');
	let description = $state('');
	let sequenceOrder = $state('1');
	let estimatedHours = $state('');

	const isEdit = $derived(matter !== null && matter !== undefined);
	const canSubmit = $derived(name.trim().length > 0 && Number(sequenceOrder) > 0);

	function fieldText(value: string | number | null | undefined): string {
		if (value === null || value === undefined) {
			return '';
		}
		return String(value).trim();
	}

	function resetForm() {
		if (matter) {
			name = matter.name;
			description = matter.description ?? '';
			sequenceOrder = String(matter.sequenceOrder);
			estimatedHours = matter.estimatedHours !== undefined ? String(matter.estimatedHours) : '';
			return;
		}
		name = '';
		description = '';
		sequenceOrder = String(defaultSequenceOrder);
		estimatedHours = '';
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function submit() {
		if (!canSubmit || busy) {
			return;
		}

		busy = true;
		try {
			const trimmedName = name.trim();
			const estimatedHoursText = fieldText(estimatedHours);
			const saved = await onSaveSubjectMatter({
				id: matter?.id,
				subjectId,
				classSubjectId,
				classGroupId,
				gradeLevelSubjectId,
				name: trimmedName,
				description: fieldText(description) || undefined,
				sequenceOrder: Number(sequenceOrder),
				estimatedHours: estimatedHoursText ? Number(estimatedHoursText) : undefined,
				successMessage: isEdit
					? get(t)('subjects.chapters.updateSuccess', { name: trimmedName })
					: get(t)('subjects.chapters.createSuccess', { name: trimmedName }),
			});
			if (saved) {
				onSaved?.(saved);
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
	title={isEdit ? $t('subjects.chapters.editTitle') : $t('subjects.chapters.createTitle')}
	description={$t('subjects.chapters.formDescription')}
	submitLabel={isEdit ? $t('common.save') : $t('subjects.chapters.add')}
	submitDisabled={!canSubmit}
	{busy}
	onSubmit={submit}
>
	<div class="space-y-4">
		<label class="block space-y-1.5">
			<span class="text-xs font-medium text-muted-foreground">{$t('subjects.chapters.name')}</span>
			<Input bind:value={name} />
		</label>
		<label class="block space-y-1.5">
			<span class="text-xs font-medium text-muted-foreground">{$t('subjects.description')}</span>
			<Input bind:value={description} />
		</label>
		<div class="grid grid-cols-2 gap-3">
			<label class="block space-y-1.5">
				<span class="text-xs font-medium text-muted-foreground">{$t('subjects.chapters.sequence')}</span>
				<Input type="number" min="1" bind:value={sequenceOrder} />
			</label>
			<label class="block space-y-1.5">
				<span class="text-xs font-medium text-muted-foreground">{$t('subjects.chapters.estimatedHours')}</span>
				<Input type="number" min="0" step="0.5" bind:value={estimatedHours} />
			</label>
		</div>
	</div>
</FormModal>

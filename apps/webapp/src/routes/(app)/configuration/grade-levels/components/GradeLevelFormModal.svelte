<script lang="ts">
	import type { GradeLevel } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getGradeLevelsPageState } from '../grade-levels-page.svelte';

	let {
		gradeLevel,
		open = $bindable(false),
	}: {
		gradeLevel?: GradeLevel;
		open?: boolean;
	} = $props();

	const gradeLevelsPage = getGradeLevelsPageState();

	let busy = $state(false);
	let name = $state('');
	let label = $state('');
	let cycle = $state('');
	let order = $state('0');
	/** Once the user edits the label, it stops mirroring the name. */
	let labelEdited = $state(false);

	const isEdit = $derived(gradeLevel !== undefined);
	const canSubmit = $derived(name.trim().length > 0 && label.trim().length > 0);
	const existingClassCount = $derived(
		gradeLevel ? gradeLevelsPage.classCountFor(gradeLevel.id) : 0,
	);
	const showLabelWarning = $derived(
		isEdit && existingClassCount > 0 && label.trim() !== gradeLevel?.label,
	);

	function resetForm() {
		labelEdited = false;
		if (gradeLevel) {
			name = gradeLevel.name;
			label = gradeLevel.label;
			cycle = gradeLevel.cycle;
			order = String(gradeLevel.order);
		}
		else {
			const nextOrder = academicContext.gradeLevels.length > 0
				? Math.max(...academicContext.gradeLevels.map(level => level.order)) + 1
				: 0;
			name = '';
			label = '';
			cycle = '';
			order = String(nextOrder);
		}
	}

	function onNameInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		name = value;
		if (!isEdit && !labelEdited) {
			label = value;
		}
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
			const ok = await gradeLevelsPage.saveGradeLevel({
				id: gradeLevel?.id,
				name: trimmedName,
				label: label.trim(),
				cycle,
				order: Number(order) || 0,
				successMessage: get(t)(
					isEdit ? 'gradeLevels.toastUpdated' : 'gradeLevels.toastCreated',
					{ name: trimmedName },
				),
			});
			if (ok) {
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
	title={isEdit ? $t('gradeLevels.edit') : $t('gradeLevels.add')}
	description={isEdit ? gradeLevel?.name : undefined}
	submitLabel={$t('academic.save')}
	cancelLabel={$t('academic.cancel')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="grid gap-4 sm:grid-cols-2">
		<label class="space-y-1.5 text-sm sm:col-span-2">
			<span class="text-muted-foreground">{$t('gradeLevels.name')}</span>
			<Input bind:value={name} oninput={onNameInput} class="rounded-xl" required />
		</label>
		<label class="space-y-1.5 text-sm sm:col-span-2">
			<span class="text-muted-foreground">{$t('gradeLevels.label')}</span>
			<Input
				bind:value={label}
				oninput={() => (labelEdited = true)}
				class="rounded-xl"
				required
			/>
			<span class="block text-xs text-muted-foreground">{$t('gradeLevels.labelHint')}</span>
			{#if showLabelWarning}
				<span class="block text-xs text-amber-600 dark:text-amber-500">
					{$t('gradeLevels.labelEditWarning', { n: existingClassCount })}
				</span>
			{/if}
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('gradeLevels.cycle')}</span>
			<Input bind:value={cycle} placeholder="Middle School" class="rounded-xl" />
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('gradeLevels.order')}</span>
			<Input type="number" min="0" bind:value={order} class="rounded-xl" />
		</label>
	</div>
</FormModal>

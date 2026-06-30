<script lang="ts">
	import type { ClassNode } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import {
		createClassGroupMutation,
		updateClassGroupMutation,
	} from '$lib/api/mutations/academic.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	let {
		classGroup,
		open = $bindable(false),
	}: {
		classGroup?: ClassNode;
		open?: boolean;
	} = $props();

	let busy = $state(false);
	let name = $state('');
	let gradeLevelId = $state(academicContext.gradeLevels[0]?.id ?? 'gl-6');
	let studentCount = $state('0');

	const isEdit = $derived(classGroup !== undefined);
	const sortedLevels = $derived([...academicContext.gradeLevels].sort((a, b) => a.order - b.order));
	const canSubmit = $derived(name.trim().length > 0);

	function resetForm() {
		if (classGroup) {
			name = classGroup.name;
			gradeLevelId = classGroup.gradeLevelId;
			studentCount = String(classGroup.studentCount);
		}
		else {
			name = '';
			gradeLevelId = academicContext.gradeLevels[0]?.id ?? 'gl-6';
			studentCount = '0';
		}
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function submit() {
		if (!canSubmit || busy)
			return;

		busy = true;
		try {
			const trimmedName = name.trim();
			if (classGroup) {
				const ok = await updateClassGroupMutation(classGroup.id, {
					name: trimmedName,
					capacity: Number(studentCount) || null,
				}, {
					successMessage: get(t)('classGroups.toastUpdated', { name: trimmedName }),
				});
				if (ok) {
					open = false;
				}
			}
			else {
				const ok = await createClassGroupMutation(trimmedName, gradeLevelId, {
					successMessage: get(t)('classGroups.toastCreated', { name: trimmedName }),
				});
				if (ok) {
					open = false;
					resetForm();
				}
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={isEdit ? $t('classGroups.edit') : $t('classGroups.add')}
	description={isEdit ? classGroup?.name : undefined}
	submitLabel={$t('academic.save')}
	cancelLabel={$t('academic.cancel')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="grid gap-4 sm:grid-cols-2">
		<label class="space-y-1.5 text-sm sm:col-span-2">
			<span class="text-muted-foreground">{$t('classGroups.name')}</span>
			<Input bind:value={name} placeholder="6th — C" class="rounded-xl" required />
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('classGroups.gradeLevel')}</span>
			<select
				bind:value={gradeLevelId}
				disabled={isEdit}
				class="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#each sortedLevels as level (level.id)}
					<option value={level.id}>{level.name} · {level.cycle}</option>
				{/each}
			</select>
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('classGroups.studentCount')}</span>
			<Input type="number" min="0" bind:value={studentCount} class="rounded-xl" />
		</label>
	</div>
</FormModal>

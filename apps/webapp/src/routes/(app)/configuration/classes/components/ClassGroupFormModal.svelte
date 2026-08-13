<script lang="ts">
	import type { ClassNode } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { sortGradeLevels } from '$lib/academic/grade-level-sort';
	import { suggestNextClassName } from '$lib/academic/next-class-name';
	import StaffPicker from '$lib/components/school/shared/pickers/StaffPicker.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getClassesPageState } from '../classes-page.svelte';

	let {
		classGroup,
		open = $bindable(false),
	}: {
		classGroup?: ClassNode;
		open?: boolean;
	} = $props();

	const classesPage = getClassesPageState();

	let busy = $state(false);
	let name = $state('');
	let gradeLevelId = $state(academicContext.gradeLevels[0]?.id ?? 'gl-6');
	let capacity = $state('');
	let attendanceMode = $state<ClassNode['attendanceMode']>('session');
	let homeroomStaffId = $state('');
	/** Once the user types a name, changing the grade level stops overwriting it. */
	let nameEdited = $state(false);

	const isEdit = $derived(classGroup !== undefined);
	const sortedLevels = $derived(sortGradeLevels(academicContext.gradeLevels));
	const staff = $derived(classesPage.staff);
	const canSubmit = $derived(name.trim().length > 0);

	function suggestedNameFor(levelId: string): string {
		const level = academicContext.gradeLevelById(levelId);
		if (!level) {
			return '';
		}
		const siblingNames = academicContext.classes
			.filter(entry => entry.gradeLevelId === levelId)
			.map(entry => entry.name);
		return suggestNextClassName(level.label, siblingNames);
	}

	function resetForm() {
		nameEdited = false;
		if (classGroup) {
			name = classGroup.name;
			gradeLevelId = classGroup.gradeLevelId;
			capacity = classGroup.capacity != null ? String(classGroup.capacity) : '';
			attendanceMode = classGroup.attendanceMode;
			homeroomStaffId = classGroup.homeroomStaffId ?? '';
		}
		else {
			gradeLevelId = academicContext.gradeLevels[0]?.id ?? 'gl-6';
			name = suggestedNameFor(gradeLevelId);
			capacity = '';
			attendanceMode = 'session';
			homeroomStaffId = '';
		}
	}

	function onGradeLevelChange(event: Event) {
		gradeLevelId = (event.currentTarget as HTMLSelectElement).value;
		if (!isEdit && !nameEdited) {
			name = suggestedNameFor(gradeLevelId);
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
			const rawCapacity
				= capacity === '' ? null : Number(capacity);
			const parsedCapacity
				= rawCapacity == null || Number.isNaN(rawCapacity) || rawCapacity <= 0
					? null
					: rawCapacity;
			if (classGroup) {
				const ok = await classesPage.updateClassGroup({
					classGroupId: classGroup.id,
					name: trimmedName,
					capacity: parsedCapacity,
					attendanceMode,
					homeroomStaffId: homeroomStaffId || classGroup.homeroomStaffId || null,
					successMessage: get(t)('classGroups.toastUpdated', { name: trimmedName }),
				});
				if (ok) {
					open = false;
				}
			}
			else {
				const ok = await classesPage.createClassGroup({
					name: trimmedName,
					gradeLevelId,
					capacity: parsedCapacity,
					attendanceMode,
					homeroomStaffId: homeroomStaffId || null,
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
			<Input
				bind:value={name}
				oninput={() => (nameEdited = true)}
				class="rounded-xl"
				required
			/>
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('classGroups.gradeLevel')}</span>
			<select
				value={gradeLevelId}
				onchange={onGradeLevelChange}
				disabled={isEdit}
				class="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#each sortedLevels as level (level.id)}
					<option value={level.id}>{level.name} · {level.cycle}</option>
				{/each}
			</select>
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('classGroups.capacity')}</span>
			<Input type="number" min="1" bind:value={capacity} class="rounded-xl" />
		</label>
		<label class="space-y-1.5 text-sm sm:col-span-2">
			<span class="text-muted-foreground">{$t('classGroups.attendanceMode')}</span>
			<select
				bind:value={attendanceMode}
				class="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<option value="session">{$t('classGroups.attendanceMode.session')}</option>
				<option value="daily">{$t('classGroups.attendanceMode.daily')}</option>
			</select>
		</label>
		<div class="space-y-1.5 text-sm sm:col-span-2">
			<span class="text-muted-foreground">{$t('classGroups.staffCoordinator')}</span>
			<StaffPicker bind:value={homeroomStaffId} {staff} active={open} class="w-full" />
		</div>
	</div>
</FormModal>

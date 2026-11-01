<script lang="ts">
	import type { ClassNode } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { sortGradeLevels } from '$lib/academic/grade-level-sort';
	import { suggestNextClassName } from '$lib/academic/next-class-name';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import SelectField from '$lib/components/ui/SelectField.svelte';
	import { t } from '$lib/i18n';
	import StaffPicker from '$lib/smart-components/staff-picker/StaffPicker.svelte';
	import { get } from 'svelte/store';
	import { getClassesPageState } from '../classes-page.svelte';

	let {
		classGroup,
		defaultGradeLevelId,
		open = $bindable(false),
	}: {
		classGroup?: ClassNode;
		defaultGradeLevelId?: string;
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
	let wasOpen = false;

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
			gradeLevelId = defaultGradeLevelId ?? academicContext.gradeLevels[0]?.id ?? '';
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
		if (open && !wasOpen) {
			resetForm();
		}
		wasOpen = open;
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
				class="rounded-collection"
				required
			/>
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('classGroups.gradeLevel')}</span>
			<SelectField
				value={gradeLevelId}
				onchange={onGradeLevelChange}
				disabled={isEdit || Boolean(defaultGradeLevelId)}
				class="control-focus flex w-full border border-input bg-background text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#each sortedLevels as level (level.id)}
					<option value={level.id}>{level.name} · {level.cycle}</option>
				{/each}
			</SelectField>
		</label>
		<label class="space-y-1.5 text-sm">
			<span class="text-muted-foreground">{$t('classGroups.capacity')}</span>
			<Input type="number" min="1" bind:value={capacity} />
		</label>
		<label class="space-y-1.5 text-sm sm:col-span-2">
			<span class="text-muted-foreground">{$t('classGroups.attendanceMode')}</span>
			<SelectField
				bind:value={attendanceMode}
				class="control-focus flex w-full border border-input bg-background text-sm shadow-sm"
			>
				<option value="session">{$t('classGroups.attendanceMode.session')}</option>
				<option value="daily">{$t('classGroups.attendanceMode.daily')}</option>
			</SelectField>
		</label>
		<div class="space-y-1.5 text-sm sm:col-span-2">
			<span class="text-muted-foreground">{$t('classGroups.staffCoordinator')}</span>
			<StaffPicker active bind:value={homeroomStaffId} {staff} class="w-full" />
		</div>
	</div>
</FormModal>

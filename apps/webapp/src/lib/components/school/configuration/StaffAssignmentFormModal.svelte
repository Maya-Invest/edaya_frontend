<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { StaffMember } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { catalogEntriesForStaffAssignmentTarget } from '$lib/api/staff-assignment-permissions';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { StaffAssignmentFormState } from '$lib/school/staff-assignment-form-state.svelte';
	import PermissionCheckboxGroup from './PermissionCheckboxGroup.svelte';

	type StaffAssignment = components['schemas']['StaffAssignment'];

	let {
		open = $bindable(false),
		staff,
		assignment = null,
	}: {
		open?: boolean;
		staff: StaffMember;
		assignment?: StaffAssignment | null;
	} = $props();

	const form = new StaffAssignmentFormState(() => staff.id);

	const classOptions = $derived(academicContext.classes);
	const subjectOptions = $derived(detailDataContext.subjectsForClass(form.classGroupId));
	const catalog = $derived(detailDataContext.permissionCatalog);
	const permissionEntries = $derived(
		catalogEntriesForStaffAssignmentTarget(catalog, form.targetKind),
	);
	const selectedClassLabel = $derived(
		classOptions.find(classGroup => classGroup.id === form.classGroupId)?.name ?? '',
	);
	const selectedSubjectLabel = $derived(
		subjectOptions.find(subject => subject.id === form.classSubjectId)?.name ?? '',
	);

	$effect(() => {
		form.prunePermissions(permissionEntries.map(entry => entry.permission));
	});

	$effect(() => {
		form.hydrateForOpen(open, assignment, classOptions[0]?.id ?? '');
	});

	$effect(() => {
		void form.loadCatalogIfNeeded(open, catalog.length);
	});

	$effect(() => {
		void form.loadSubjectsIfNeeded(open, form.classGroupId);
	});

	$effect(() => {
		form.ensureClassSubjectSelected(open, subjectOptions.map(subject => subject.id));
	});
</script>

<FormModal
	bind:open
	title={assignment ? $t('staff.editAssignment') : $t('staff.addAssignment')}
	description={$t('staff.assignmentFormHint')}
	submitLabel={$t('common.save')}
	busy={form.busy}
	submitDisabled={!form.canSubmit}
	onSubmit={() => form.submit(assignment, () => {
		open = false;
	})}
>
	<div class="space-y-4">
		<div class="space-y-2">
			<Label for="assignment-target">{$t('staff.assignmentTarget')}</Label>
			<select
				id="assignment-target"
				bind:value={form.targetKind}
				class="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
			>
				<option value="class_group">{$t('staff.assignmentTargetClass')}</option>
				<option value="class_subject">{$t('staff.assignmentTargetSubject')}</option>
			</select>
		</div>

		<div class="space-y-2">
			<Label>{$t('roles.scopeClassGroup')}</Label>
			<Select.Root
				type="single"
				value={form.classGroupId}
				onValueChange={(value) => {
					if (!value) {
						return;
					}
					form.selectClassGroup(value);
				}}
			>
				<Select.Trigger class="h-10 w-full rounded-xl">
					<Select.Value placeholder={$t('roles.selectClassGroup')}>
						{selectedClassLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content>
					{#each classOptions as classGroup (classGroup.id)}
						<Select.Item value={classGroup.id} label={classGroup.name}>
							{classGroup.name}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		{#if form.targetKind === 'class_subject'}
			<div class="space-y-2">
				<Label>{$t('roles.scopeClassSubject')}</Label>
				<Select.Root
					type="single"
					value={form.classSubjectId}
					onValueChange={(value) => {
						if (value) {
							form.classSubjectId = value;
						}
					}}
				>
					<Select.Trigger class="h-10 w-full rounded-xl">
						<Select.Value placeholder={$t('roles.selectClassSubject')}>
							{selectedSubjectLabel || $t('roles.selectClassSubject')}
						</Select.Value>
					</Select.Trigger>
					<Select.Content class="z-[100]">
						{#if subjectOptions.length === 0}
							<p class="px-2 py-1.5 text-xs text-muted-foreground">{$t('roles.scopeNoClassSubjects')}</p>
						{/if}
						{#each subjectOptions as subject (subject.id)}
							<Select.Item value={subject.id} label={subject.name}>
								{subject.name}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		{/if}

		<div class="space-y-2">
			<Label for="assignment-responsibility">{$t('staff.assignmentResponsibility')}</Label>
			<Input
				id="assignment-responsibility"
				bind:value={form.responsibility}
				placeholder={$t('staff.assignmentResponsibilityPlaceholder')}
			/>
		</div>

		<div class="space-y-2">
			<Label>{$t('staff.assignmentPermissions')}</Label>
			<p class="text-xs text-muted-foreground">{$t('staff.assignmentPermissionsHint')}</p>
			<PermissionCheckboxGroup entries={permissionEntries} bind:selected={form.permissions} />
		</div>
	</div>
</FormModal>

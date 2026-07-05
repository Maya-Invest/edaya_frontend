<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { StaffMember } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import {
		createStaffAssignmentPayload,
		saveStaffAssignmentMutation,
	} from '$lib/api/mutations/staff-assignments.mutations';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import { loadClassSubjects } from '$lib/api/subjects-data';
	import { catalogEntriesForStaffAssignmentTarget } from '$lib/api/staff-assignment-permissions';
	import { loadPermissionCatalog } from '$lib/api/staff-permission-assignments-data';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { detailDataContext } from '$lib/detail-data/context.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import PermissionCheckboxGroup from './PermissionCheckboxGroup.svelte';

	type StaffAssignment = components['schemas']['StaffAssignment'];
	type TargetKind = 'class_group' | 'class_subject';

	let {
		open = $bindable(false),
		staff,
		assignment = null,
	}: {
		open?: boolean;
		staff: StaffMember;
		assignment?: StaffAssignment | null;
	} = $props();

	let busy = $state(false);
	let targetKind = $state<TargetKind>('class_group');
	let classGroupId = $state('');
	let classSubjectId = $state('');
	let responsibility = $state('');
	let permissions = $state<StaffAssignment['permissions']>([]);
	let catalogLoaded = $state(false);

	const classOptions = $derived(academicContext.classes);
	const subjectOptions = $derived(detailDataContext.subjectsForClass(classGroupId));
	const catalog = $derived(detailDataContext.permissionCatalog);
	const permissionEntries = $derived(
		catalogEntriesForStaffAssignmentTarget(catalog, targetKind),
	);
	const selectedClassLabel = $derived(
		classOptions.find(classGroup => classGroup.id === classGroupId)?.name ?? '',
	);
	const selectedSubjectLabel = $derived(
		subjectOptions.find(subject => subject.id === classSubjectId)?.name ?? '',
	);

	$effect(() => {
		const allowed = new Set(permissionEntries.map(entry => entry.permission));
		const pruned = permissions.filter(permission => allowed.has(permission));
		if (pruned.length !== permissions.length) {
			permissions = pruned;
		}
	});

	$effect(() => {
		if (!open) {
			return;
		}
		if (assignment) {
			targetKind = assignment.classSubjectId ? 'class_subject' : 'class_group';
			classSubjectId = assignment.classSubjectId ?? '';
			classGroupId = assignment.classGroupId
				?? detailDataContext.subjects.find(subject => subject.id === assignment.classSubjectId)?.classId
				?? '';
			responsibility = assignment.responsibility;
			permissions = [...(assignment.permissions ?? [])];
		}
		else {
			targetKind = 'class_group';
			classGroupId = classOptions[0]?.id ?? '';
			classSubjectId = '';
			responsibility = '';
			permissions = [];
		}
	});

	$effect(() => {
		if (!open || catalogLoaded || catalog.length > 0) {
			return;
		}
		void (async () => {
			const entries = await loadPermissionCatalog(getBrowserSchoolClient());
			detailDataContext.seedStaffPermissionData({
				assignments: detailDataContext.staffPermissionAssignments,
				catalog: entries,
			});
			catalogLoaded = true;
		})();
	});

	$effect(() => {
		if (!open || !classGroupId) {
			return;
		}
		if (detailDataContext.subjectsForClass(classGroupId).length > 0) {
			return;
		}
		void (async () => {
			const subjects = await loadClassSubjects(getBrowserSchoolClient(), classGroupId);
			detailDataContext.seedSubjects(subjects, { classId: classGroupId });
		})();
	});

	$effect(() => {
		if (!open || targetKind !== 'class_subject' || subjectOptions.length === 0) {
			return;
		}
		if (classSubjectId && subjectOptions.some(subject => subject.id === classSubjectId)) {
			return;
		}
		classSubjectId = subjectOptions[0]?.id ?? '';
	});

	const canSubmit = $derived(responsibility.trim().length > 0 && classGroupId.length > 0 && (targetKind === 'class_group' || classSubjectId.length > 0));

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		const id = assignment?.id ?? `sa-${Date.now().toString(36)}`;
		const payload = createStaffAssignmentPayload({
			id,
			staffId: staff.id,
			responsibility: responsibility.trim(),
			permissions,
			classGroupId: targetKind === 'class_group' ? classGroupId : undefined,
			classSubjectId: targetKind === 'class_subject' ? classSubjectId : undefined,
		});

		const ok = await saveStaffAssignmentMutation({
			assignment: payload,
			successMessage: get(t)('staff.assignmentSaved'),
		});
		busy = false;

		if (ok) {
			open = false;
		}
	}
</script>

<FormModal
	bind:open
	title={assignment ? $t('staff.editAssignment') : $t('staff.addAssignment')}
	description={$t('staff.assignmentFormHint')}
	submitLabel={$t('common.save')}
	{busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<div class="space-y-4">
		<div class="space-y-2">
			<Label for="assignment-target">{$t('staff.assignmentTarget')}</Label>
			<select
				id="assignment-target"
				bind:value={targetKind}
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
				value={classGroupId}
				onValueChange={(value) => {
					if (!value) {
						return;
					}
					classGroupId = value;
					classSubjectId = '';
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

		{#if targetKind === 'class_subject'}
			<div class="space-y-2">
				<Label>{$t('roles.scopeClassSubject')}</Label>
				<Select.Root
					type="single"
					value={classSubjectId}
					onValueChange={(value) => {
						if (value) {
							classSubjectId = value;
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
				bind:value={responsibility}
				placeholder={$t('staff.assignmentResponsibilityPlaceholder')}
			/>
		</div>

		<div class="space-y-2">
			<Label>{$t('staff.assignmentPermissions')}</Label>
			<p class="text-xs text-muted-foreground">{$t('staff.assignmentPermissionsHint')}</p>
			<PermissionCheckboxGroup entries={permissionEntries} bind:selected={permissions} />
		</div>
	</div>
</FormModal>

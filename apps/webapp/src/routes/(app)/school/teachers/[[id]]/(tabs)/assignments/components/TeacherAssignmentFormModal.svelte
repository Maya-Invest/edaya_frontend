<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { Teacher } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { entitiesByIds, uniqueIds } from '$lib/api/entity-list-filters';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import { authSession } from '$lib/auth/session.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { pickClassSubjectIdForTeacherSubject } from '$lib/teachers/pick-class-subject-for-teacher';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { createTeacherAssignmentPayload } from '../../../../lib/teacher-detail-mutations';
	import { getTeachersPageState } from '../../../../teachers-page.svelte';

	let {
		open = $bindable(false),
		teacher,
	}: {
		open?: boolean;
		teacher: Teacher;
	} = $props();

	const teachersPage = getTeachersPageState();

	let busy = $state(false);
	let kind = $state<components['schemas']['TeacherAssignment']['kind']>('subject');
	let classGroupId = $state('');
	let classSubjectIds = $state<string[]>(['']);
	let classSubjects = $state<components['schemas']['ClassSubject'][]>([]);
	let subjectLabels = $state<Record<string, string>>({});

	const classOptions = $derived(
		academicContext.classes.map(entry => ({ value: entry.id, label: entry.name })),
	);

	const subjectOptions = $derived(
		classSubjects.map(entry => ({
			value: entry.id,
			label: subjectLabels[entry.id] ?? entry.id,
		})),
	);

	const selectedSubjectIds = $derived(classSubjectIds.filter(entry => entry.trim().length > 0));

	const canSubmit = $derived(
		Boolean(classGroupId)
		&& (kind === 'homeroom' || selectedSubjectIds.length > 0),
	);

	async function loadClassSubjects(nextClassGroupId: string) {
		classSubjectIds = [''];
		classSubjects = [];
		subjectLabels = {};
		if (!nextClassGroupId) {
			return;
		}
		const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
		if (!schoolId) {
			return;
		}
		const client = getBrowserSchoolClient();
		const nextClassSubjects = await client.entities.classSubjects.list({
			schoolId,
			classGroupId: nextClassGroupId,
		});
		classSubjects = nextClassSubjects;
		const subjectIds = uniqueIds(nextClassSubjects.map(entry => entry.subjectId));
		const subjects = subjectIds.length > 0
			? await client.entities.subjects.list(entitiesByIds(subjectIds))
			: [];
		subjectLabels = Object.fromEntries(nextClassSubjects.map((entry) => {
			const name = subjects.find(subject => subject.id === entry.subjectId)?.name ?? entry.id;
			return [entry.id, name];
		}));
		const defaultSubjectId = pickClassSubjectIdForTeacherSubject(nextClassSubjects, teacher.subjectId);
		classSubjectIds = defaultSubjectId ? [defaultSubjectId] : [''];
	}

	function addSubjectRow() {
		classSubjectIds = [...classSubjectIds, ''];
	}

	function updateSubjectSelection(index: number, value: string) {
		classSubjectIds = classSubjectIds.map((entry, entryIndex) => entryIndex === index ? value : entry);
	}

	$effect(() => {
		if (!open) {
			kind = 'subject';
			classGroupId = '';
			classSubjectIds = [''];
			classSubjects = [];
			subjectLabels = {};
		}
	});

	$effect(() => {
		if (open && classGroupId && kind === 'subject') {
			void loadClassSubjects(classGroupId);
		}
	});

	async function submit() {
		if (!canSubmit) {
			return;
		}

		busy = true;
		try {
			if (kind === 'homeroom') {
				const id = `ta-${Date.now().toString(36)}`;
				const assignment = createTeacherAssignmentPayload({
					id,
					teacherId: teacher.id,
					kind,
					classGroupId,
					classSubjectId: null,
				});
				const ok = await teachersPage.saveAssignment({
					assignment,
					successMessage: get(t)('teacher.assignmentCreated'),
				});
				if (ok) {
					open = false;
				}
				return;
			}

			let saved = 0;
			for (const classSubjectId of selectedSubjectIds) {
				const id = `ta-${Date.now().toString(36)}-${saved}`;
				const assignment = createTeacherAssignmentPayload({
					id,
					teacherId: teacher.id,
					kind: 'subject',
					classGroupId,
					classSubjectId,
				});
				const ok = await teachersPage.saveAssignment({
					assignment,
					successMessage: saved === 0 ? get(t)('teacher.assignmentCreated') : undefined,
				});
				if (ok) {
					saved += 1;
				}
			}

			if (saved > 0) {
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
	title={$t('teacher.assignmentCreateTitle')}
	description={$t('teacher.assignmentCreateDescription', { name: teacher.name })}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<div class="space-y-4">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('teacher.assignmentKindLabel')}
			</Label>
			<FilterSelect
				bind:value={kind}
				options={[
					{ value: 'subject', label: $t('teacher.assignmentKind.subject') },
					{ value: 'homeroom', label: $t('teacher.assignmentKind.homeroom') },
				]}
			/>
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('teacher.classGroupLabel')}
			</Label>
			<FilterSelect
				bind:value={classGroupId}
				options={[{ value: '', label: $t('teacher.selectClassGroup') }, ...classOptions]}
			/>
		</div>
		{#if kind === 'subject'}
			<div class="space-y-3">
				{#each classSubjectIds as classSubjectId, index (index)}
					<div class="flex items-end gap-2">
						<div class="min-w-0 flex-1 space-y-1.5">
							<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
								{$t('teacher.classSubjectLabel')}
							</Label>
							<FilterSelect
								value={classSubjectId}
								onValueChange={value => value && updateSubjectSelection(index, value)}
								options={[{ value: '', label: $t('teacher.selectClassSubject') }, ...subjectOptions]}
							/>
						</div>
						{#if index === classSubjectIds.length - 1}
							<Button type="button" variant="outline" class="shrink-0 rounded-full" onclick={addSubjectRow}>
								{$t('teacher.addSubject')}
							</Button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</FormModal>

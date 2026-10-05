<script lang="ts">
	import type { components } from '$lib/api/schema';
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t, lang } from '$lib/i18n';
	import { catalogSubjectName } from '$lib/i18n/catalog-label';
	import { pickClassSubjectIdForTeacherSubject } from '$lib/teachers/pick-class-subject-for-teacher';
	import { get } from 'svelte/store';
	import { createTeacherAssignmentPayload } from '../../../../school/teachers/lib/teacher-detail-mutations';
	import { getTeacherAssignmentsPageState } from '../teacher-assignments-page.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const hubPage = getTeacherAssignmentsPageState();

	let busy = $state(false);
	let teacherId = $state('');
	let kind = $state<components['schemas']['TeacherAssignment']['kind']>('subject');
	let classGroupId = $state('');
	let classSubjectIds = $state<string[]>(['']);
	let classSubjects = $state<components['schemas']['ClassSubject'][]>([]);
	let subjectLabels = $state<Record<string, string>>({});
	let classSubjectsLoadId = 0;

	const teacherOptions = $derived(
		hubPage.teachers.map(teacher => ({ value: teacher.id, label: teacher.name })),
	);

	const classOptions = $derived(
		academicContext.classes.map(entry => ({ value: entry.id, label: entry.name })),
	);

	const subjectOptions = $derived(
		classSubjects.map(entry => ({
			value: entry.id,
			label: subjectLabels[entry.id] ?? entry.id,
		})),
	);

	const selectedTeacher = $derived(hubPage.findTeacher(teacherId));

	const selectedSubjectIds = $derived(classSubjectIds.filter(entry => entry.trim().length > 0));

	const canSubmit = $derived(
		Boolean(teacherId) && Boolean(classGroupId) && (kind === 'homeroom' || selectedSubjectIds.length > 0),
	);

	async function loadClassSubjects(nextClassGroupId: string) {
		const loadId = ++classSubjectsLoadId;
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
		const { classSubjects: nextClassSubjects, subjects } = await hubPage.loadClassSubjectChoices(schoolId, nextClassGroupId);
		if (loadId !== classSubjectsLoadId)
			return;
		classSubjects = nextClassSubjects;
		subjectLabels = Object.fromEntries(nextClassSubjects.map((entry) => {
			const subject = subjects.find(item => item.id === entry.subjectId);
			const name = subject
				? catalogSubjectName(subject.name, $lang, subject.code)
				: entry.id;
			return [entry.id, name];
		}));
		const teacher = selectedTeacher;
		if (!teacher) {
			return;
		}
		const hasManualSelections = classSubjectIds.some(entry => entry.trim().length > 0)
			|| classSubjectIds.length > 1;
		if (hasManualSelections) {
			return;
		}
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
		if (open) {
			void hubPage.ensureTeachersLoaded();
		}
	});

	$effect(() => {
		if (!open) {
			teacherId = '';
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
		if (!canSubmit || !teacherId) {
			return;
		}

		busy = true;
		try {
			if (kind === 'homeroom') {
				const id = `ta-${Date.now().toString(36)}`;
				const assignment = createTeacherAssignmentPayload({
					id,
					teacherId,
					kind,
					classGroupId,
					classSubjectId: null,
				});
				const ok = await hubPage.saveAssignment({
					assignment,
					successMessage: get(t)('teacher.assignmentCreated'),
				});
				if (ok) {
					open = false;
				}
				return;
			}

			let saved = 0;
			for (const classSubjectId of [...new Set(selectedSubjectIds)]) {
				const id = `ta-${Date.now().toString(36)}-${saved}`;
				const assignment = createTeacherAssignmentPayload({
					id,
					teacherId,
					kind: 'subject',
					classGroupId,
					classSubjectId,
				});
				const ok = await hubPage.saveAssignment({
					assignment,
					successMessage: saved === 0 ? get(t)('teacher.assignmentCreated') : undefined,
				});
				if (ok) {
					await hubPage.ensureClassSubjectsCached([classSubjectId]);
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
	title={$t('tools.teacherAssignments.createTitle')}
	description={$t('tools.teacherAssignments.createDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<div class="space-y-4">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('tools.teacherAssignments.teacherLabel')}
			</Label>
			{#if teacherOptions.length === 0}
				<p class="text-sm text-muted-foreground">{$t('tools.teacherAssignments.noTeachers')}</p>
			{:else}
				<FilterSelect
					bind:value={teacherId}
					options={[{ value: '', label: $t('tools.teacherAssignments.selectTeacher') }, ...teacherOptions]}
				/>
			{/if}
		</div>
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
								onchange={value => updateSubjectSelection(index, value)}
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

<script lang="ts">
	import type { components } from '$lib/api/schema';
	import type { Teacher } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { entitiesByIds, uniqueIds } from '$lib/api/entity-list-filters';
	import {
		createTeacherAssignmentPayload,
		saveTeacherAssignmentMutation,
	} from '$lib/api/mutations/teacher.mutations';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import { authSession } from '$lib/auth/session.svelte';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	let {
		open = $bindable(false),
		teacher,
	}: {
		open?: boolean;
		teacher: Teacher;
	} = $props();

	let busy = $state(false);
	let kind = $state<components['schemas']['TeacherAssignment']['kind']>('subject');
	let classGroupId = $state('');
	let classSubjectId = $state('');
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

	const canSubmit = $derived(
		Boolean(classGroupId)
			&& (kind === 'homeroom' || Boolean(classSubjectId)),
	);

	async function loadClassSubjects(nextClassGroupId: string) {
		classSubjectId = '';
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
	}

	$effect(() => {
		if (!open) {
			kind = 'subject';
			classGroupId = '';
			classSubjectId = '';
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
		if (!canSubmit)
			return;

		busy = true;
		const id = `ta-${Date.now().toString(36)}`;
		const assignment = createTeacherAssignmentPayload({
			id,
			teacherId: teacher.id,
			kind,
			classGroupId,
			classSubjectId: kind === 'subject' ? classSubjectId : null,
		});
		const ok = await saveTeacherAssignmentMutation({
			assignment,
			successMessage: get(t)('teacher.assignmentCreated'),
		});
		busy = false;
		if (ok) {
			open = false;
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
			<div class="space-y-1.5">
				<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('teacher.classSubjectLabel')}
				</Label>
				<FilterSelect
					bind:value={classSubjectId}
					options={[{ value: '', label: $t('teacher.selectClassSubject') }, ...subjectOptions]}
				/>
			</div>
		{/if}
	</div>
</FormModal>

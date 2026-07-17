import type { components } from '$lib/api/schema';
import type { Deadline } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

type ApiAssessment = components['schemas']['Assessment'];

const UI_TO_API_KIND: Record<Deadline['type'], ApiAssessment['kind']> = {
	Homework: 'homework',
	Project: 'project',
	Reading: 'other',
	Lab: 'other',
};

const API_TO_UI_KIND: Record<ApiAssessment['kind'], Deadline['type']> = {
	homework: 'Homework',
	project: 'Project',
	quiz: 'Homework',
	other: 'Reading',
};

function deadlineSnapshot(deadlineId: string): Deadline | undefined {
	return detailDataContext.deadlines.find(deadline => deadline.id === deadlineId);
}

export async function createHomeworkMutation(input: {
	classGroupId: string;
	classSubjectId: string;
	title: string;
	description: string;
	dueDate: string;
	assignedDate: string;
	type: Deadline['type'];
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const schoolId = authSession.schoolId;
	const periodId = academicContext.periodId;
	if (!schoolId || !periodId) {
		toast.error(get(t)('hw.noContext'));
		return null;
	}

	const id = `hw-${Date.now().toString(36)}`;
	const subject = detailDataContext.subjects.find(entry => entry.id === input.classSubjectId);
	const optimistic: Deadline = {
		id,
		classId: input.classGroupId,
		title: input.title.trim(),
		subject: subject?.name ?? '—',
		description: input.description.trim(),
		dueDate: input.dueDate,
		assignedDate: input.assignedDate,
		type: input.type,
		attachments: [],
		submissions: detailDataContext.studentsForClass(input.classGroupId).map(student => ({
			studentId: student.id,
			status: 'missing' as const,
		})),
	};

	const result = await runMutation(() => client.entities.assessments.save({
		id,
		classGroupId: input.classGroupId,
		classSubjectId: input.classSubjectId,
		periodId,
		title: input.title.trim(),
		kind: UI_TO_API_KIND[input.type],
		maxScore: 20,
		coefficient: 1,
		description: input.description.trim(),
		dueAt: input.dueDate,
		attachments: [],
		lessonSessionId: null,
		startsAt: null,
		endsAt: null,
		completedAt: null,
		createdAt: new Date().toISOString(),
	}), {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.appendDeadline(optimistic);
		},
		rollback: () => {
			detailDataContext.removeDeadline(id);
		},
	});
	return result ? id : null;
}

export async function updateHomeworkMutation(input: {
	assignmentId: string;
	title: string;
	description: string;
	dueDate: string;
	assignedDate: string;
	type: Deadline['type'];
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const previous = deadlineSnapshot(input.assignmentId);

	const result = await runMutation(async () => {
		const existing = await client.entities.assessments.get(input.assignmentId);
		const payload: ApiAssessment = {
			...existing,
			title: input.title.trim(),
			description: input.description.trim(),
			dueAt: input.dueDate,
			kind: UI_TO_API_KIND[input.type],
		};
		return client.entities.assessments.save(payload);
	}, {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchDeadline(input.assignmentId, {
				title: input.title.trim(),
				description: input.description.trim(),
				dueDate: input.dueDate,
				assignedDate: input.assignedDate,
				type: API_TO_UI_KIND[UI_TO_API_KIND[input.type]] ?? input.type,
			});
		},
		rollback: () => {
			if (previous) {
				detailDataContext.patchDeadline(input.assignmentId, previous);
			}
		},
	});
	return result !== null;
}

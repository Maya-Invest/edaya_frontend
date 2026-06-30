import type { components } from '$lib/api/schema';
import type { Deadline } from '$lib/types/school';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';

type ApiHomeworkAssignment = components['schemas']['HomeworkAssignment'];

const UI_TO_API_TYPE: Record<Deadline['type'], ApiHomeworkAssignment['type']> = {
	Homework: 'homework',
	Project: 'project',
	Reading: 'reading',
	Lab: 'lab',
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
	if (!schoolId) {
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

	const result = await runMutation(() => client.entities.homeworkAssignments.save({
		id,
		schoolId,
		classGroupId: input.classGroupId,
		classSubjectId: input.classSubjectId,
		title: input.title.trim(),
		description: input.description.trim(),
		dueDate: input.dueDate,
		assignedDate: input.assignedDate,
		type: UI_TO_API_TYPE[input.type],
		attachments: [],
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
		const existing = await client.entities.homeworkAssignments.get(input.assignmentId);
		const payload: ApiHomeworkAssignment = {
			...existing,
			title: input.title.trim(),
			description: input.description.trim(),
			dueDate: input.dueDate,
			assignedDate: input.assignedDate,
			type: UI_TO_API_TYPE[input.type],
		};
		return client.entities.homeworkAssignments.save(payload);
	}, {
		successMessage: input.successMessage,
		apply: () => {
			detailDataContext.patchDeadline(input.assignmentId, {
				title: input.title.trim(),
				description: input.description.trim(),
				dueDate: input.dueDate,
				assignedDate: input.assignedDate,
				type: input.type,
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

import type { components } from '$lib/api/schema';
import { academicContext } from '$lib/academic/context.svelte';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';

type StaffAssignment = components['schemas']['StaffAssignment'];

export async function saveStaffAssignmentMutation(input: {
	assignment: StaffAssignment;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const assignment = input.assignment;

	const result = await runMutation(async () => {
		if (assignment.classSubjectId) {
			return client.commands.assignStaffToClassSubject({
				id: assignment.id,
				staffId: assignment.staffId,
				academicYearId: assignment.academicYearId,
				responsibility: assignment.responsibility,
				permissions: assignment.permissions,
				classSubjectId: assignment.classSubjectId,
				createdAt: assignment.createdAt,
			});
		}
		if (assignment.lessonSessionId) {
			return client.commands.assignStaffToLessonSession({
				id: assignment.id,
				staffId: assignment.staffId,
				academicYearId: assignment.academicYearId,
				responsibility: assignment.responsibility,
				permissions: assignment.permissions,
				lessonSessionId: assignment.lessonSessionId,
				createdAt: assignment.createdAt,
			});
		}
		if (assignment.classGroupId) {
			return client.commands.assignStaffToClass({
				id: assignment.id,
				staffId: assignment.staffId,
				academicYearId: assignment.academicYearId,
				responsibility: assignment.responsibility,
				permissions: assignment.permissions,
				classGroupId: assignment.classGroupId,
				createdAt: assignment.createdAt,
			});
		}
		return client.entities.staffAssignments.save(assignment);
	}, {
		successMessage: input.successMessage,
		versionKeys: ['staff'],
	});

	return result !== null;
}

export async function deleteStaffAssignmentMutation(input: {
	id: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();

	const result = await runMutation(
		() => client.entities.staffAssignments.delete({ id: input.id }),
		{
			successMessage: input.successMessage,
			versionKeys: ['staff'],
		},
	);

	return result !== null;
}

export function createStaffAssignmentPayload(input: {
	id: string;
	staffId: string;
	responsibility: string;
	permissions: StaffAssignment['permissions'];
	classGroupId?: string;
	classSubjectId?: string;
}): StaffAssignment {
	return {
		id: input.id,
		staffId: input.staffId,
		academicYearId: academicContext.yearId,
		responsibility: input.responsibility,
		permissions: [...input.permissions],
		classGroupId: input.classGroupId ?? null,
		classSubjectId: input.classSubjectId ?? null,
		lessonSessionId: null,
		activitySessionId: null,
		assessmentId: null,
	};
}

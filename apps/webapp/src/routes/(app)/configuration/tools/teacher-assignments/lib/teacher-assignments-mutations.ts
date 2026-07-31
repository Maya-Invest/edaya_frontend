import type { components } from '$lib/api/schema';
import type { TeacherAssignmentsPageState } from '../teacher-assignments-page.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { runTeacherRouteMutation } from '../../../../school/teachers/lib/teacher-route-mutation';

type TeacherAssignment = components['schemas']['TeacherAssignment'];

export async function saveTeacherAssignmentOnHub(
	state: TeacherAssignmentsPageState,
	input: {
		assignment: TeacherAssignment;
		successMessage?: string;
	},
): Promise<boolean> {
	const previous = state.assignments.find(row => row.id === input.assignment.id);

	const result = await runTeacherRouteMutation({
		request: () => getBrowserSchoolClient().entities.teacherAssignments.save(input.assignment),
		apply: () => state.upsertAssignment(input.assignment),
		rollback: () => {
			if (previous) {
				state.upsertAssignment(previous);
			}
			else {
				state.removeAssignment(input.assignment.id);
			}
		},
		successMessage: input.successMessage,
		versionKeys: ['teachers'],
	});

	return result !== null;
}

export async function deleteTeacherAssignmentOnHub(
	state: TeacherAssignmentsPageState,
	input: {
		id: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const previous = state.assignments.find(row => row.id === input.id);

	const result = await runTeacherRouteMutation({
		request: () => getBrowserSchoolClient().entities.teacherAssignments.delete({ id: input.id }),
		apply: () => state.removeAssignment(input.id),
		rollback: () => {
			if (previous) {
				state.upsertAssignment(previous);
			}
		},
		successMessage: input.successMessage,
		versionKeys: ['teachers'],
	});

	return result !== null;
}

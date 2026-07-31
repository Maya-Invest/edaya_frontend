import type { getBrowserSchoolClient } from '$lib/api/school-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface SaveTeacherAssignmentInput {
	assignmentId: string;
	teacherId: string;
	academicYearId: string;
	classGroupId: string;
	classSubjectId: string;
}

export async function saveTeacherAssignment(
	client: SchoolClient,
	input: SaveTeacherAssignmentInput,
): Promise<void> {
	await client.entities.teacherAssignments.save({
		id: input.assignmentId,
		teacherId: input.teacherId,
		academicYearId: input.academicYearId,
		kind: 'subject',
		classSubjectId: input.classSubjectId,
		classGroupId: input.classGroupId,
		responsibility: null,
		status: 'active',
	});
}

export function createTeacherAssignmentImportId(
	rowIndex: number,
	assignmentIndex: number,
	seed = Date.now().toString(36),
): string {
	return `ta-${seed}-${rowIndex}-${assignmentIndex}`;
}

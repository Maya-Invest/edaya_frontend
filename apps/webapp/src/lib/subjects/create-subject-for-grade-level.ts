import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Subject } from '$lib/types/school';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface CreateSubjectForGradeLevelInput {
	schoolId: string;
	academicYearId: string;
	gradeLevelId: string;
	subjectId: string;
	classSubjectIdsByClassGroupId: Record<string, string>;
	name: string;
	code?: string;
	coefficient?: number;
	categoryId: string;
	color?: Subject['color'];
	createdAt?: string;
}

export function createSubjectImportIdsForGradeLevel(
	index: number,
	gradeLevelId: string,
	classGroupIds: readonly string[],
	seed = Date.now().toString(36),
): {
	subjectId: string;
	classSubjectIdsByClassGroupId: Record<string, string>;
} {
	const subjectId = `subj-${seed}-${index}`;
	const classSubjectIdsByClassGroupId = Object.fromEntries(
		classGroupIds.map(classGroupId => [
			classGroupId,
			`cs-${classGroupId}-${subjectId.slice(-6)}`,
		]),
	);

	return {
		subjectId,
		classSubjectIdsByClassGroupId,
	};
}

export async function createSubjectForGradeLevel(
	client: SchoolClient,
	input: CreateSubjectForGradeLevelInput,
): Promise<{ subjectId: string; classSubjectIds: string[] }> {
	const createdAt = input.createdAt ?? new Date().toISOString();
	const code = input.code?.trim() ?? '';

	await client.commands.configureSubject({
		id: input.subjectId,
		gradeLevelId: input.gradeLevelId,
		academicYearId: input.academicYearId,
		classSubjectIdsByClassGroupId: input.classSubjectIdsByClassGroupId,
		name: input.name.trim(),
		categoryId: input.categoryId,
		color: input.color ?? 'mint',
		...(code ? { code } : {}),
		...(input.coefficient != null ? { coefficient: input.coefficient } : {}),
		createdAt,
	});

	return {
		subjectId: input.subjectId,
		classSubjectIds: Object.values(input.classSubjectIdsByClassGroupId),
	};
}

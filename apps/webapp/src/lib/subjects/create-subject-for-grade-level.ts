import type { Subject, SubjectCategory } from '$lib/types/school';
import type { getBrowserSchoolClient } from '$lib/api/school-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface CreateSubjectForGradeLevelInput {
	schoolId: string;
	academicYearId: string;
	gradeLevelId: string;
	subjectId: string;
	gradeLevelSubjectId: string;
	classSubjectIdsByClassGroupId: Record<string, string>;
	name: string;
	code?: string;
	coefficient?: number;
	category?: SubjectCategory;
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
	gradeLevelSubjectId: string;
	classSubjectIdsByClassGroupId: Record<string, string>;
} {
	const subjectId = `subj-${seed}-${index}`;
	const gradeLevelSubjectId = `gls-${gradeLevelId}-${subjectId.slice(-6)}`;
	const classSubjectIdsByClassGroupId = Object.fromEntries(
		classGroupIds.map(classGroupId => [
			classGroupId,
			`cs-${classGroupId}-${subjectId.slice(-6)}`,
		]),
	);

	return {
		subjectId,
		gradeLevelSubjectId,
		classSubjectIdsByClassGroupId,
	};
}

export async function createSubjectForGradeLevel(
	client: SchoolClient,
	input: CreateSubjectForGradeLevelInput,
): Promise<{ gradeLevelSubjectId: string; classSubjectIds: string[] }> {
	const createdAt = input.createdAt ?? new Date().toISOString();
	const code = input.code?.trim() ?? '';

	await client.entities.subjects.save({
		id: input.subjectId,
		schoolId: input.schoolId,
		name: input.name.trim(),
		category: input.category ?? 'Scientifique',
		color: input.color ?? 'mint',
		...(code ? { code } : {}),
		...(input.coefficient != null ? { defaultCoefficient: input.coefficient } : {}),
		createdAt,
	});

	await client.commands.offerSubjectToGradeLevel({
		id: input.gradeLevelSubjectId,
		gradeLevelId: input.gradeLevelId,
		academicYearId: input.academicYearId,
		subjectId: input.subjectId,
		isOptional: false,
		createdAt,
		classSubjectIdsByClassGroupId: input.classSubjectIdsByClassGroupId,
		...(input.coefficient != null ? { coefficient: input.coefficient } : {}),
	});

	return {
		gradeLevelSubjectId: input.gradeLevelSubjectId,
		classSubjectIds: Object.values(input.classSubjectIdsByClassGroupId),
	};
}

import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Subject } from '$lib/types/school';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface CreateSubjectForClassInput {
	schoolId: string;
	classGroupId: string;
	subjectId: string;
	classSubjectId: string;
	name: string;
	disciplineId?: string | null;
	shortName?: string | null;
	isOptional?: boolean;

	code?: string;
	coefficient?: number;
	categoryId: string;
	color?: Subject['color'];
	createdAt?: string;
}

export function createSubjectImportIds(
	index: number,
	classGroupId: string,
	seed = Date.now().toString(36),
): { subjectId: string; classSubjectId: string } {
	const subjectId = `subj-${seed}-${index}`;
	const classSubjectId = `cs-${classGroupId}-${subjectId.slice(-6)}`;
	return { subjectId, classSubjectId };
}

export async function createSubjectForClass(
	client: SchoolClient,
	input: CreateSubjectForClassInput,
): Promise<void> {
	const classGroup = await client.entities.classGroups.get(input.classGroupId);
	await client.commands.configureSubject({
		id: input.subjectId,
		gradeLevelId: classGroup.gradeLevelId,
		academicYearId: classGroup.academicYearId,
		name: input.name.trim(),
		disciplineId: input.disciplineId,
		shortName: input.shortName,
		isOptional: input.isOptional,
		categoryId: input.categoryId,
		color: input.color ?? 'mint',
		code: input.code?.trim() || undefined,
		coefficient: input.coefficient,
		classSubjectIdsByClassGroupId: { [input.classGroupId]: input.classSubjectId },
		createdAt: input.createdAt ?? new Date().toISOString(),
	});
}

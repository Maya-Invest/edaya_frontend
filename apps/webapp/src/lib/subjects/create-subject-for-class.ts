import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Subject, SubjectCategory } from '$lib/types/school';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface CreateSubjectForClassInput {
	schoolId: string;
	classGroupId: string;
	subjectId: string;
	classSubjectId: string;
	name: string;
	code?: string;
	coefficient?: number;
	category?: SubjectCategory;
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
	const createdAt = input.createdAt ?? new Date().toISOString();
	const code = input.code?.trim() ?? '';

	await client.commands.configureSubject({
		id: input.subjectId,
		name: input.name.trim(),
		category: input.category ?? 'Scientifique',
		color: input.color ?? 'mint',
		...(code ? { code } : {}),
		...(input.coefficient != null ? { defaultCoefficient: input.coefficient } : {}),
		createdAt,
	});

	await client.commands.addCustomClassSubject({
		id: input.classSubjectId,
		classGroupId: input.classGroupId,
		subjectId: input.subjectId,
		isOffered: true,
		createdAt,
		...(input.coefficient != null ? { coefficient: input.coefficient } : {}),
	});
}

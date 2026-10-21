import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Subject } from '$lib/types/school';
import type { SubjectWorkload } from './subject-workload';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface UpdateSubjectInput extends Partial<SubjectWorkload> {
	classSubjectId: string;
	subjectId?: string;
	name: string;
	categoryId: string;
	color: Subject['color'];
}

export async function updateSubject(client: SchoolClient, input: UpdateSubjectInput) {
	const subjectId = input.subjectId ?? (await client.entities.classSubjects.get(input.classSubjectId)).subjectId;
	return client.commands.updateSubject({ subjectId, name: input.name, categoryId: input.categoryId, color: input.color, periodsPerWeek: input.periodsPerWeek, minPeriodSpan: input.minPeriodSpan, maxPeriodSpan: input.maxPeriodSpan });
}

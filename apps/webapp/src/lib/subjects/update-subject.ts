import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Subject } from '$lib/types/school';
import type { SubjectWorkload } from './subject-workload';
import { listAllEntityPages } from '$lib/api/entity-list-filters';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface UpdateSubjectInput extends Partial<SubjectWorkload> {
	classSubjectId: string;
	subjectId?: string;
	name: string;
	disciplineId?: string | null;
	code?: string | null;
	coefficient?: number | null;
	shortName?: string | null;
	isOptional?: boolean;
	expectedParticipationRevisions?: Record<string, number>;

	categoryId: string;
	color: Subject['color'];
}

export async function updateSubject(client: SchoolClient, input: UpdateSubjectInput) {
	const subjectId = input.subjectId ?? (await client.entities.classSubjects.get(input.classSubjectId)).subjectId;
	return client.commands.updateSubject({ subjectId, name: input.name, disciplineId: input.disciplineId, shortName: input.shortName, isOptional: input.isOptional, expectedParticipationRevisions: input.expectedParticipationRevisions, categoryId: input.categoryId, color: input.color, periodsPerWeek: input.periodsPerWeek, minPeriodSpan: input.minPeriodSpan, maxPeriodSpan: input.maxPeriodSpan });
}

export async function loadSubjectParticipationRevisions(client: SchoolClient, subjectId: string) {
	const offerings = await listAllEntityPages(query => client.entities.classSubjects.list(query), { baseQuery: { subjectId } });
	return Object.fromEntries(offerings.map(row => [row.id, row.participationRevision]));
}

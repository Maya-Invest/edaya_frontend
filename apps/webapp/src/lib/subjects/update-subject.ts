import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Subject } from '$lib/types/school';
import type { SubjectWorkload } from './subject-workload';
import { buildSubjectConfigCommand } from '$lib/api/subject-save-payload';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface UpdateSubjectInput extends Partial<SubjectWorkload> {
	classSubjectId: string;
	gradeLevelSubjectId?: string;
	name: string;
	categoryId: string;
	color: Subject['color'];
}

export async function updateSubject(client: SchoolClient, input: UpdateSubjectInput) {
	if (input.gradeLevelSubjectId) {
		return client.commands.updateGradeLevelSubject({
			gradeLevelSubjectId: input.gradeLevelSubjectId,
			name: input.name,
			categoryId: input.categoryId,
			color: input.color,
			periodsPerWeek: input.periodsPerWeek,
			minPeriodSpan: input.minPeriodSpan,
			maxPeriodSpan: input.maxPeriodSpan,
		});
	}
	const classSubject = await client.entities.classSubjects.get(input.classSubjectId);
	const subject = await client.entities.subjects.get(classSubject.subjectId);
	return client.commands.configureSubject(buildSubjectConfigCommand(subject, {
		id: subject.id,
		name: input.name,
		categoryId: input.categoryId,
		color: input.color,
	}));
}

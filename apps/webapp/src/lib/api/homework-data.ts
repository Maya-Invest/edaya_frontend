import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Deadline } from '$lib/types/school';
import {
	classGroupScope,
	listAllEntityPages,
	listAllEntityPagesByIds,
	listAllEntityPagesForIdFilters,
	homeworkAssessmentsForClass,
	uniqueIds,
} from '$lib/api/entity-list-filters';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type AssessmentRaw = components['schemas']['Assessment'];
type AssessmentResultRaw = components['schemas']['AssessmentResult'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectRaw = components['schemas']['Subject'];

export interface HomeworkSources {
	homeworkAssessmentsRaw: AssessmentRaw[];
	assessmentResultsRaw: AssessmentResultRaw[];
	classSubjectsRaw: ClassSubjectRaw[];
	subjectsRaw: SubjectRaw[];
}

const KIND_TO_UI: Record<AssessmentRaw['kind'], Deadline['type']> = {
	homework: 'Homework',
	project: 'Project',
	quiz: 'Homework',
	other: 'Reading',
};

const RESULT_STATUS_TO_UI: Record<string, Deadline['submissions'][number]['status']> = {
	met: 'submitted',
	late: 'late',
	missed: 'missing',
	excused: 'submitted',
};

function formatDate(value: unknown): string {
	if (!value) {
		return '';
	}
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	if (typeof value === 'string') {
		return value.slice(0, 10);
	}
	return String(value).slice(0, 10);
}

function subjectNameForClassSubject(
	classSubjectId: string,
	classSubjectsRaw: ClassSubjectRaw[],
	subjectsRaw: SubjectRaw[],
): string {
	const classSubject = classSubjectsRaw.find(entry => entry.id === classSubjectId);
	if (!classSubject) {
		return 'Unknown subject';
	}

	const subject = subjectsRaw.find(entry => entry.id === classSubject.subjectId);
	return subject?.name ?? 'Unknown subject';
}

export async function fetchClassHomeworkSources(
	client: SchoolClient,
	classGroupId: string,
	periodId?: string,
): Promise<HomeworkSources> {
	const [
		homeworkAssessmentsRaw,
		classSubjectsRaw,
	] = await Promise.all([
		listAllEntityPages(query => client.entities.assessments.list(query), {
			baseQuery: homeworkAssessmentsForClass(classGroupId, periodId),
		}),
		listAllEntityPages(query => client.entities.classSubjects.list(query), {
			baseQuery: classGroupScope(classGroupId),
		}),
	]);

	const assessmentIds = uniqueIds(homeworkAssessmentsRaw.map(assessment => assessment.id));
	const subjectIds = uniqueIds(classSubjectsRaw.map(classSubject => classSubject.subjectId));

	const [
		assessmentResultsRaw,
		subjectsRaw,
	] = await Promise.all([
		listAllEntityPagesForIdFilters(
			query => client.entities.assessmentResults.list(query),
			[{ field: 'assessmentId', ids: assessmentIds }],
		),
		listAllEntityPagesByIds(query => client.entities.subjects.list(query), subjectIds),
	]);

	return {
		homeworkAssessmentsRaw,
		assessmentResultsRaw,
		classSubjectsRaw,
		subjectsRaw,
	};
}

export function mapDeadlines(sources: HomeworkSources): Deadline[] {
	const resultsByAssessment = new Map<string, AssessmentResultRaw[]>();
	for (const result of sources.assessmentResultsRaw) {
		const current = resultsByAssessment.get(result.assessmentId) ?? [];
		current.push(result);
		resultsByAssessment.set(result.assessmentId, current);
	}

	return sources.homeworkAssessmentsRaw
		.map((assessment) => {
			const results = resultsByAssessment.get(assessment.id) ?? [];

			return {
				id: assessment.id,
				classId: assessment.classGroupId,
				title: assessment.title,
				subject: subjectNameForClassSubject(
					assessment.classSubjectId,
					sources.classSubjectsRaw,
					sources.subjectsRaw,
				),
				description: assessment.description ?? '',
				dueDate: formatDate(assessment.dueAt),
				assignedDate: formatDate(assessment.createdAt),
				type: KIND_TO_UI[assessment.kind] ?? 'Homework',
				attachments: (assessment.attachments ?? []).map(attachment => ({
					name: attachment.name,
					size: attachment.size,
				})),
				submissions: results.map(result => ({
					studentId: result.studentId,
					status: result.status
						? (RESULT_STATUS_TO_UI[result.status] ?? 'missing')
						: (typeof result.score === 'number' ? 'submitted' as const : 'missing' as const),
					date: result.createdAt ? formatDate(result.createdAt) : undefined,
				})),
			} satisfies Deadline;
		})
		.sort((left, right) => left.dueDate.localeCompare(right.dueDate));
}

export async function fetchDeadlines(
	classGroupId: string,
	client?: SchoolClient,
	options?: { periodId?: string },
): Promise<Deadline[]> {
	const resolvedClient = client ?? (await import('$lib/api/school-client')).getBrowserSchoolClient();
	const sources = await fetchClassHomeworkSources(resolvedClient, classGroupId, options?.periodId);
	return mapDeadlines(sources);
}

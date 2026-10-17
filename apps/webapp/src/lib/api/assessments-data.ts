import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { AssessmentResultRow, Evaluation, Subject } from '$lib/types/school';
import {
	mapAssessmentResultRow,
	mapAssessmentToEvaluation,
} from '$lib/api/assessment-mapping';
import {
	activeEnrollmentsForClass,
	listAllEntityPages,
	listAllEntityPagesForIdFilters,
	uniqueIds,
} from '$lib/api/entity-list-filters';

import { mapClassSubjects } from '$lib/api/subjects-data';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type AssessmentRaw = components['schemas']['Assessment'];
type AssessmentResultRaw = components['schemas']['AssessmentResult'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectRaw = components['schemas']['Subject'];
type EnrollmentRaw = components['schemas']['StudentClassEnrollment'];

export interface AssessmentsSources {
	assessmentsRaw: AssessmentRaw[];
	resultsRaw: AssessmentResultRaw[];
	classSubjectsRaw: ClassSubjectRaw[];
	subjectsRaw: SubjectRaw[];
	enrollmentsRaw: EnrollmentRaw[];
	classSize?: number;
	readableMarkAssessmentIds?: string[];
}

export function mapAssessmentResults(
	resultsRaw: AssessmentsSources['resultsRaw'],
): AssessmentResultRow[] {
	return (resultsRaw ?? []).map(mapAssessmentResultRow);
}

export async function fetchClassAssessmentsSources(
	client: SchoolClient,
	classGroupId: string,
	periodId: string,
	includeMarks = false,
): Promise<AssessmentsSources> {
	const context = await client.queries.getAssessmentEditorContext({ classGroupId, periodId });
	const enrollmentsRaw = includeMarks ? await listAllEntityPages(query => client.entities.enrollments.list(query), { baseQuery: activeEnrollmentsForClass(classGroupId) }) : [];
	const resultsRaw = includeMarks
		? await listAllEntityPagesForIdFilters(query => client.entities.assessmentResults.list(query), [
				{ field: 'assessmentId', ids: uniqueIds(context.assessmentsRaw.map(row => row.id)) },
				{ field: 'studentId', ids: uniqueIds(enrollmentsRaw.map(row => row.studentId)) },
			])
		: context.markResults.flatMap(entry => entry.results);
	return { ...context, resultsRaw, enrollmentsRaw, readableMarkAssessmentIds: includeMarks ? context.assessmentsRaw.map(row => row.id) : context.markResults.map(entry => entry.assessmentId) };
}

export function mapClassEvaluations(
	classGroupId: string,
	sources: AssessmentsSources,
): Evaluation[] {
	const subjectById = new Map(sources.subjectsRaw.map(subject => [subject.id, subject]));
	const classSubjectById = new Map(sources.classSubjectsRaw.map(entry => [entry.id, entry]));
	const classSize = sources.classSize ?? sources.enrollmentsRaw.filter(
		enrollment => enrollment.classGroupId === classGroupId && enrollment.status === 'active',
	).length;

	return sources.assessmentsRaw
		.filter(assessment => assessment.classGroupId === classGroupId)
		.map((assessment) => {
			const classSubject = classSubjectById.get(assessment.classSubjectId);
			const subject = classSubject ? subjectById.get(classSubject.subjectId) : undefined;
			const assessmentResults = sources.resultsRaw.filter(result => result.assessmentId === assessment.id);

			return { ...mapAssessmentToEvaluation(assessment, {
				subjectName: subject?.name ?? assessment.title,
				classSize,
				results: assessmentResults,
			}), marksAvailable: sources.readableMarkAssessmentIds?.includes(assessment.id) ?? true };
		})
		.sort((left, right) => right.date.localeCompare(left.date));
}

export async function loadClassEvaluations(
	client: SchoolClient,
	classGroupId: string,
	periodId: string,
): Promise<Evaluation[]> {
	const { evaluations } = await loadClassEvaluationsPageData(client, classGroupId, periodId);
	return evaluations;
}

export async function loadAssessmentForEdit(client: SchoolClient, classGroupId: string, periodId: string, assessmentId: string): Promise<AssessmentRaw> {
	const context = await client.queries.getAssessmentEditorContext({ classGroupId, periodId });
	const assessment = context.assessmentsRaw.find(row => row.id === assessmentId);
	if (!assessment)
		throw new Error('ASSESSMENT_NOT_AVAILABLE');
	return assessment;
}

export async function loadClassEvaluationsPageData(
	client: SchoolClient,
	classGroupId: string,
	periodId: string,
): Promise<{ evaluations: Evaluation[]; assessmentResults: AssessmentResultRow[]; subjects: Subject[] }> {
	const sources = await fetchClassAssessmentsSources(client, classGroupId, periodId);
	return {
		evaluations: mapClassEvaluations(classGroupId, sources),
		subjects: mapClassSubjects(classGroupId, { ...sources, subjectMattersRaw: [], teachersRaw: [], teacherAssignmentsRaw: [], staffMembersRaw: [], staffAssignmentsRaw: [] }),
		assessmentResults: mapAssessmentResults(sources.resultsRaw),
	};
}

import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { AssessmentResultRow, Evaluation } from '$lib/types/school';
import {
	activeEnrollmentsForClass,
	assessmentResultsForScope,
	assessmentsForClassPeriod,
	classGroupScope,
	entitiesByIds,
	uniqueIds,
} from '$lib/api/entity-list-filters';

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
}

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

export function mapAssessmentResults(
	resultsRaw: AssessmentsSources['resultsRaw'],
): AssessmentResultRow[] {
	return (resultsRaw ?? []).map(result => ({
		id: result.id,
		studentId: result.studentId,
		assessmentId: result.assessmentId,
		score: typeof result.score === 'number' ? result.score : null,
	}));
}

export async function fetchClassAssessmentsSources(
	client: SchoolClient,
	classGroupId: string,
	periodId: string,
): Promise<AssessmentsSources> {
	const [
		assessmentsRaw,
		classSubjectsRaw,
		enrollmentsRaw,
	] = await Promise.all([
		client.entities.assessments.list(assessmentsForClassPeriod(classGroupId, periodId)),
		client.entities.classSubjects.list(classGroupScope(classGroupId)),
		client.entities.enrollments.list(activeEnrollmentsForClass(classGroupId)),
	]);

	const assessmentIds = uniqueIds((assessmentsRaw ?? []).map(assessment => assessment.id));
	const studentIds = uniqueIds((enrollmentsRaw ?? []).map(enrollment => enrollment.studentId));
	const subjectIds = uniqueIds((classSubjectsRaw ?? []).map(classSubject => classSubject.subjectId));

	const [
		resultsRaw,
		subjectsRaw,
	] = await Promise.all([
		assessmentIds.length > 0 && studentIds.length > 0
			? client.entities.assessmentResults.list(assessmentResultsForScope(assessmentIds, studentIds))
			: Promise.resolve([]),
		subjectIds.length > 0
			? client.entities.subjects.list(entitiesByIds(subjectIds))
			: Promise.resolve([]),
	]);

	return {
		assessmentsRaw: assessmentsRaw ?? [],
		resultsRaw: resultsRaw ?? [],
		classSubjectsRaw: classSubjectsRaw ?? [],
		subjectsRaw: subjectsRaw ?? [],
		enrollmentsRaw: enrollmentsRaw ?? [],
	};
}

export function mapClassEvaluations(
	classGroupId: string,
	sources: AssessmentsSources,
): Evaluation[] {
	const subjectById = new Map(sources.subjectsRaw.map(subject => [subject.id, subject]));
	const classSubjectById = new Map(sources.classSubjectsRaw.map(entry => [entry.id, entry]));
	const classSize = sources.enrollmentsRaw.filter(
		enrollment => enrollment.classGroupId === classGroupId && enrollment.status === 'active',
	).length;

	return sources.assessmentsRaw
		.filter(assessment => assessment.classGroupId === classGroupId)
		.map((assessment) => {
			const classSubject = classSubjectById.get(assessment.classSubjectId);
			const subject = classSubject ? subjectById.get(classSubject.subjectId) : undefined;
			const assessmentResults = sources.resultsRaw.filter(result => result.assessmentId === assessment.id);
			const scoredResults = assessmentResults.filter(result => typeof result.score === 'number');
			const averageMark = scoredResults.length > 0
				? scoredResults.reduce((sum, result) => sum + (result.score ?? 0), 0) / scoredResults.length
				: 0;

			return {
				id: assessment.id,
				classId: assessment.classGroupId,
				title: assessment.title,
				subject: subject?.name ?? assessment.title,
				date: formatDate(assessment.date ?? assessment.dueAt ?? assessment.metAt),
				coefficient: assessment.coefficient ?? 1,
				averageMark,
				outOf: assessment.maxScore,
				graded: scoredResults.length,
				total: classSize,
			} satisfies Evaluation;
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

export async function loadClassEvaluationsPageData(
	client: SchoolClient,
	classGroupId: string,
	periodId: string,
): Promise<{ evaluations: Evaluation[]; assessmentResults: AssessmentResultRow[] }> {
	const sources = await fetchClassAssessmentsSources(client, classGroupId, periodId);
	return {
		evaluations: mapClassEvaluations(classGroupId, sources),
		assessmentResults: mapAssessmentResults(sources.resultsRaw),
	};
}

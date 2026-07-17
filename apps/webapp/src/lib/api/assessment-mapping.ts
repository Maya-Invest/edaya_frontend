import type { components } from '$lib/api/schema';
import type { AssessmentResultRow, Evaluation, EvaluationSubmission } from '$lib/types/school';

type AssessmentRaw = components['schemas']['Assessment'];
type AssessmentResultRaw = components['schemas']['AssessmentResult'];

const RESULT_STATUS_TO_UI: Record<string, EvaluationSubmission['status']> = {
	met: 'submitted',
	late: 'late',
	missed: 'missing',
	excused: 'submitted',
};

export function formatAssessmentDate(value: unknown): string {
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

export function mapAssessmentSubmission(
	result: AssessmentResultRaw,
): EvaluationSubmission {
	return {
		studentId: result.studentId,
		status: result.status
			? (RESULT_STATUS_TO_UI[result.status] ?? 'missing')
			: (typeof result.score === 'number' ? 'submitted' : 'missing'),
		date: result.createdAt ? formatAssessmentDate(result.createdAt) : undefined,
	};
}

export function mapAssessmentResultRow(result: AssessmentResultRaw): AssessmentResultRow {
	return {
		id: result.id,
		studentId: result.studentId,
		assessmentId: result.assessmentId,
		score: typeof result.score === 'number' ? result.score : null,
		status: result.status ?? null,
	};
}

export function mapAssessmentToEvaluation(
	assessment: AssessmentRaw,
	sources: {
		subjectName: string;
		classSize: number;
		results: AssessmentResultRaw[];
	},
): Evaluation {
	const scoredResults = sources.results.filter(result => typeof result.score === 'number');
	const submissions = sources.results.map(mapAssessmentSubmission);
	const submittedCount = submissions.filter(submission => submission.status === 'submitted').length;
	const averageMark = scoredResults.length > 0
		? scoredResults.reduce((sum, result) => sum + (result.score ?? 0), 0) / scoredResults.length
		: 0;
	const dueDate = formatAssessmentDate(assessment.dueAt);
	const assignedDate = formatAssessmentDate(assessment.createdAt);
	const startsAt = assessment.startsAt ? String(assessment.startsAt) : undefined;
	const endsAt = assessment.endsAt ? String(assessment.endsAt) : undefined;

	return {
		id: assessment.id,
		classId: assessment.classGroupId,
		classSubjectId: assessment.classSubjectId,
		title: assessment.title,
		subject: sources.subjectName,
		kind: assessment.kind,
		date: formatAssessmentDate(
			assessment.startsAt ?? assessment.dueAt ?? assessment.completedAt ?? assessment.endsAt,
		),
		coefficient: assessment.coefficient ?? 1,
		averageMark,
		outOf: assessment.maxScore,
		graded: scoredResults.length,
		total: sources.classSize,
		description: assessment.description ?? '',
		dueDate: dueDate || undefined,
		assignedDate: assignedDate || undefined,
		startsAt,
		endsAt,
		lessonSessionId: assessment.lessonSessionId ?? null,
		attachments: (assessment.attachments ?? []).map(attachment => ({
			name: attachment.name,
			size: attachment.size,
		})),
		submissions,
		submittedCount,
	};
}

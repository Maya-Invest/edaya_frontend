import type { components } from '$lib/api/schema';
import type { AssessmentResultRow, Evaluation, EvaluationSubmission } from '$lib/types/school';

import { roundedSample } from './grade-intervals';

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
			: (typeof result.score === 'number' || result.mentionId ? 'submitted' : 'missing'),
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
		designation: result.designation,
		mentionId: result.mentionId,
		calculation: result.calculation,
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
	const statistics = assessmentStatistics(sources.results);
	const submissions = sources.results.map(mapAssessmentSubmission);
	const submittedCount = submissions.filter(submission => submission.status === 'submitted').length;
	const dueDate = formatAssessmentDate(assessment.dueAt);
	const assignedDate = formatAssessmentDate(assessment.createdAt);
	const startsAt = assessment.startsAt ? String(assessment.startsAt) : undefined;
	const endsAt = assessment.endsAt ? String(assessment.endsAt) : undefined;

	return {
		marksRevision: assessment.marksRevision,
		marksStatus: assessment.marksStatus,
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
		...statistics,
		outOf: assessment.maxScore,
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

export function assessmentStatistics(results: readonly Pick<AssessmentResultRaw, 'score' | 'designation' | 'mentionId' | 'calculation'>[]): Pick<Evaluation, 'graded' | 'averageMark' | 'averageOutOf' | 'averagePrecision' | 'gradingUpdating'> {
	const scored = results.filter(row => row.designation !== 'absent' && row.designation !== 'exempt' && (typeof row.score === 'number' || row.mentionId));
	const graded = results.filter(row => typeof row.score === 'number' || row.mentionId || row.designation === 'absent' || row.designation === 'exempt').length;
	const calculation = scored.find(row => row.calculation)?.calculation;
	if (calculation) {
		const updating = scored.some(row => !row.calculation || row.calculation.policyRevision !== calculation.policyRevision || row.calculation.scaleId !== calculation.scaleId);
		return { graded, gradingUpdating: updating, averageOutOf: calculation.maximum, averagePrecision: calculation.decimalPlaces, averageMark: updating ? 0 : roundedSample(scored.reduce((sum, row) => sum + row.calculation!.value, 0) / scored.length, calculation.decimalPlaces, calculation.roundingMode) };
	}
	return { graded, averageMark: scored.length ? scored.reduce((sum, row) => sum + (row.score ?? 0), 0) / scored.length : 0, ...(scored.some(row => row.mentionId) ? { gradingUpdating: true } : {}) };
}

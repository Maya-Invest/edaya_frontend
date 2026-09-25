import type { AssessmentResultRow, Evaluation, Student, Subject } from '$lib/types/school';

export interface EvaluationsPageSlice {
	classId: string;
	evaluations: Evaluation[];
	assessmentResults: AssessmentResultRow[];
	students: Student[];
	subjects: Subject[];
}

export function emptyEvaluationsSlice(classId: string): EvaluationsPageSlice {
	return {
		classId,
		evaluations: [],
		assessmentResults: [],
		students: [],
		subjects: [],
	};
}

export function normalizedDescription(description?: string): string | undefined {
	const trimmed = description?.trim();
	return trimmed || undefined;
}

export function evaluationStatsFromResults(
	assessmentId: string,
	results: readonly AssessmentResultRow[],
): Pick<Evaluation, 'graded' | 'averageMark'> {
	const scored = results.filter(
		result => result.assessmentId === assessmentId && typeof result.score === 'number',
	);
	return {
		graded: results.filter(result => result.assessmentId === assessmentId && (result.score !== null || result.designation === 'absent' || result.designation === 'exempt')).length,
		averageMark: scored.length > 0
			? scored.reduce((sum, result) => sum + (result.score ?? 0), 0) / scored.length
			: 0,
	};
}

export function assessmentResultIdFor(assessmentId: string, studentId: string): string {
	return `ar-${assessmentId}-${studentId}`;
}

export function upsertAssessmentResultRow(
	results: readonly AssessmentResultRow[],
	result: AssessmentResultRow,
): AssessmentResultRow[] {
	return [
		...results.filter(entry => entry.id !== result.id),
		result,
	];
}

export function removeAssessmentResultRow(
	results: readonly AssessmentResultRow[],
	id: string,
): AssessmentResultRow[] {
	return results.filter(result => result.id !== id);
}

/** Apply path used when the grade-entry modal submits a score. */
export function applyGradeEntry(input: {
	results: readonly AssessmentResultRow[];
	assessmentId: string;
	studentId: string;
	score: number | null;
	designation?: 'scored' | 'absent' | 'exempt';
}): {
	resultId: string;
	previousResult: AssessmentResultRow | undefined;
	nextResults: AssessmentResultRow[];
	stats: Pick<Evaluation, 'graded' | 'averageMark'>;
} {
	const resultId = assessmentResultIdFor(input.assessmentId, input.studentId);
	const previousResult = input.results.find(result => result.id === resultId);
	const nextResults = upsertAssessmentResultRow(input.results, {
		id: resultId,
		studentId: input.studentId,
		assessmentId: input.assessmentId,
		score: input.score,
		designation: input.designation,
	});
	return {
		resultId,
		previousResult,
		nextResults,
		stats: evaluationStatsFromResults(input.assessmentId, nextResults),
	};
}

export function rollbackGradeEntry(input: {
	results: readonly AssessmentResultRow[];
	resultId: string;
	previousResult: AssessmentResultRow | undefined;
	assessmentId: string;
}): {
	nextResults: AssessmentResultRow[];
	stats: Pick<Evaluation, 'graded' | 'averageMark'>;
} {
	const nextResults = input.previousResult
		? upsertAssessmentResultRow(input.results, input.previousResult)
		: removeAssessmentResultRow(input.results, input.resultId);
	return {
		nextResults,
		stats: evaluationStatsFromResults(input.assessmentId, nextResults),
	};
}

export function evaluationDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/evaluations\/([^/]+)/);
	return match?.[2];
}

export function evaluationsClassIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/([^/]+)\/evaluations/);
	return match?.[1];
}

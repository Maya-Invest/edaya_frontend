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
		graded: scored.length,
		averageMark: scored.length > 0
			? scored.reduce((sum, result) => sum + (result.score ?? 0), 0) / scored.length
			: 0,
	};
}

export function evaluationDetailIdFromUrl(url: URL): string | undefined {
	const match = url.pathname.match(/\/classes\/[^/]+\/evaluations\/([^/]+)/);
	return match?.[1];
}

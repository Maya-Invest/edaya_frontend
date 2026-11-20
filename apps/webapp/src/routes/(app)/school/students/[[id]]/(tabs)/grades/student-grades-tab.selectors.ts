import type { Evaluation, StudentGradeRow } from '$lib/types/school';

export interface StudentSubjectGroupItem { e: Evaluation; mark: number | null; href?: string }

export function buildStudentGradeSummaryFromRows(
	rows: readonly StudentGradeRow[],
	evaluationHref?: (row: StudentGradeRow) => string | undefined,
): {
	studentEvals: Evaluation[];
	valid: number[];
	overall: number;
	subjectGroups: Array<{ subject: string; items: StudentSubjectGroupItem[]; subjectAvg: number | null }>;
} {
	const studentEvals: Evaluation[] = rows.map(row => ({
		id: row.assessmentId,
		classId: row.classGroupId,
		classSubjectId: '',
		title: row.title,
		subject: row.subject,
		kind: row.kind,
		date: row.date,
		coefficient: row.coefficient,
		averageMark: row.score ?? 0,
		outOf: row.outOf,
		graded: row.score !== null ? 1 : 0,
		total: 1,
		attachments: [],
		submissions: [],
		submittedCount: 0,
	}));
	const valid: number[] = [];
	let weightedSum = 0;
	let weightTotal = 0;
	for (const row of rows) {
		if (row.score === null)
			continue;
		valid.push(row.score);
		weightedSum += (row.score / row.outOf) * 20 * row.coefficient;
		weightTotal += row.coefficient;
	}
	const overall = valid.length ? weightedSum / weightTotal : 0;

	const groups: Record<string, StudentSubjectGroupItem[]> = {};
	rows.forEach((row, index) => {
		const evaluation = studentEvals[index]!;
		const items = groups[row.subject] ?? [];
		items.push({
			e: evaluation,
			mark: row.score,
			href: evaluationHref?.(row),
		});
		groups[row.subject] = items;
	});

	const subjectGroups = Object.entries(groups).map(([subject, items]) => {
		const graded = items.filter(item => item.mark !== null);
		const subjectWeightedSum = graded.reduce(
			(accumulator, item) =>
				accumulator + (item.mark! / item.e.outOf) * 20 * item.e.coefficient,
			0,
		);
		const subjectWeightTotal = graded.reduce(
			(accumulator, item) => accumulator + item.e.coefficient,
			0,
		);
		const subjectAvg = graded.length ? subjectWeightedSum / subjectWeightTotal : null;
		return { subject, items, subjectAvg };
	});

	return { studentEvals, valid, overall, subjectGroups };
}

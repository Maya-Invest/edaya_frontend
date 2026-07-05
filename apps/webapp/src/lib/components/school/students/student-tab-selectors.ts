import type { SubjectGroupItem } from '$lib/components/school/shared/drawer-types';
import type {
	AbsenceRecord,
	Evaluation,
	Incident,
	PedagogicalNote,
	Student,
	StudentAttendanceHistoryItem,
	StudentBilling,
	StudentGradeRow,
} from '$lib/types/school';

export function sortPedagogicalNotes(
	notes: readonly PedagogicalNote[],
	studentId: string,
): PedagogicalNote[] {
	return notes
		.filter(note => note.studentId === studentId)
		.sort((left, right) => right.date.localeCompare(left.date));
}

export function buildStudentGradeSummaryFromRows(
	rows: readonly StudentGradeRow[],
	evaluationHref?: (row: StudentGradeRow) => string | undefined,
): {
	studentEvals: Evaluation[];
	valid: number[];
	overall: number;
	subjectGroups: Array<{ subject: string; items: SubjectGroupItem[]; subjectAvg: number | null }>;
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
	const marks = rows.map(row => row.score);
	const valid = marks.filter((mark): mark is number => mark !== null);
	const weightedSum = valid.reduce(
		(accumulator, mark, index) =>
			accumulator + (mark / rows[index].outOf) * 20 * rows[index].coefficient,
		0,
	);
	const weightTotal = valid.reduce(
		(accumulator, _mark, index) => accumulator + rows[index].coefficient,
		0,
	);
	const overall = valid.length ? weightedSum / weightTotal : 0;

	const groups: Record<string, SubjectGroupItem[]> = {};
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

export function buildStudentGradeSummary(
	student: Pick<Student, 'id' | 'classId' | 'average'>,
	evaluations: readonly Evaluation[],
): {
	studentEvals: Evaluation[];
	valid: number[];
	overall: number;
	subjectGroups: Array<{ subject: string; items: SubjectGroupItem[]; subjectAvg: number | null }>;
} {
	const studentEvals = evaluations
		.filter(evaluation => evaluation.classId === student.classId)
		.sort((left, right) => right.date.localeCompare(left.date));
	const seed = student.id.charCodeAt(1) || 1;
	const marks = studentEvals.map((evaluation, index) => {
		const base = evaluation.graded > 0 ? (student.average / 20) * evaluation.outOf : 0;
		const jitter = ((seed * (index + 1)) % 5) - 2;
		return evaluation.graded > 0 ? Math.max(0, Math.min(evaluation.outOf, base + jitter)) : null;
	});
	const valid = marks.filter((mark): mark is number => mark !== null);
	const weightedSum = valid.reduce(
		(accumulator, mark, index) =>
			accumulator + (mark / studentEvals[index].outOf) * 20 * studentEvals[index].coefficient,
		0,
	);
	const weightTotal = valid.reduce(
		(accumulator, _mark, index) => accumulator + studentEvals[index].coefficient,
		0,
	);
	const overall = valid.length ? weightedSum / weightTotal : 0;

	const groups: Record<string, SubjectGroupItem[]> = {};
	studentEvals.forEach((evaluation, index) => {
		const items = groups[evaluation.subject] ?? [];
		items.push({ e: evaluation, mark: marks[index] });
		groups[evaluation.subject] = items;
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

export function summarizeStudentAttendanceHistory(
	records: readonly StudentAttendanceHistoryItem[],
): {
	records: StudentAttendanceHistoryItem[];
	present: number;
	absent: number;
	late: number;
} {
	return {
		records: [...records],
		present: records.filter(record => record.status === 'present').length,
		absent: records.filter(record => record.status === 'absent').length,
		late: records.filter(record => record.status === 'late').length,
	};
}

export function sortStudentAbsences(
	absences: readonly AbsenceRecord[],
	studentId: string,
): AbsenceRecord[] {
	return absences
		.filter(absence => absence.studentId === studentId)
		.sort((left, right) =>
			(right.date + right.time).localeCompare(left.date + left.time),
		);
}

export function summarizeStudentIncidents(incidents: readonly Incident[]): {
	sorted: Incident[];
	high: number;
	med: number;
	low: number;
} {
	const sorted = [...incidents].sort((left, right) => right.date.localeCompare(left.date));
	return {
		sorted,
		high: sorted.filter(incident => incident.severity === 'high').length,
		med: sorted.filter(incident => incident.severity === 'medium').length,
		low: sorted.filter(incident => incident.severity === 'low').length,
	};
}

export function summarizeStudentFinances(billing: readonly StudentBilling[], studentId: string): {
	studentBilling: StudentBilling[];
	total: number;
	paid: number;
	balance: number;
} {
	const studentBilling = billing.filter(item => item.studentId === studentId);
	const total = studentBilling.reduce((accumulator, item) => accumulator + item.total, 0);
	const paid = studentBilling.reduce((accumulator, item) => accumulator + item.paid, 0);
	return { studentBilling, total, paid, balance: total - paid };
}

export const pedagogicalNoteToneByCategory: Record<PedagogicalNote['category'], string> = {
	Comportement: 'bg-destructive/10 text-destructive',
	Travail: 'bg-highlight-soft text-highlight',
	Progression: 'bg-secondary text-foreground/80',
	Encouragement: 'bg-secondary text-foreground/80',
};

export const billingStatusTone: Record<'paid' | 'partial' | 'due' | 'overdue', string> = {
	paid: 'bg-secondary text-foreground/80',
	partial: 'bg-highlight-soft text-highlight',
	due: 'bg-secondary text-muted-foreground',
	overdue: 'bg-destructive/10 text-destructive',
};

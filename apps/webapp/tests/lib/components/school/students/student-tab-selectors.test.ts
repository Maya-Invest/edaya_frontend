import type { Evaluation, StudentBilling } from '$lib/types/school';
import { describe, expect, it } from 'bun:test';
import {
	buildStudentGradeSummary,
	summarizeStudentFinances,
	summarizeStudentIncidents,
} from '$lib/components/school/students/student-tab-selectors';

const student = { id: 's1', classId: 'class-a', average: 16 };

function evaluation(id: string, subject: string, graded: number, outOf = 20, coefficient = 1): Evaluation {
	return {
		id,
		classId: 'class-a',
		classSubjectId: `cs-${id}`,
		title: id,
		subject,
		kind: 'quiz',
		date: `2026-01-${id.padStart(2, '0')}`,
		coefficient,
		averageMark: 14,
		outOf,
		graded,
		total: 24,
		attachments: [],
		submissions: [],
		submittedCount: 0,
	};
}

describe('student tab selectors', () => {
	it('groups grades by subject and computes the weighted overall average', () => {
		const summary = buildStudentGradeSummary(student, [
			evaluation('1', 'Math', 20, 20, 2),
			evaluation('2', 'Math', 10, 20, 1),
			evaluation('3', 'French', 0, 20, 1),
		]);

		expect(summary.studentEvals).toHaveLength(3);
		expect(summary.valid).toHaveLength(2);
		expect(summary.subjectGroups).toHaveLength(2);
		const mathGroup = summary.subjectGroups.find(group => group.subject === 'Math');
		expect(mathGroup?.items).toHaveLength(2);
		expect(summary.overall).toBeGreaterThan(0);
	});

	it('summarizes incident severities in descending date order', () => {
		const summary = summarizeStudentIncidents([
			{
				id: 'i1',
				studentId: 's1',
				involvedStudentIds: ['s1'],
				involvedCount: 1,
				date: '2026-02-01',
				category: 'Behavior',
				severity: 'high',
				summary: 'A',
				status: 'open',
			},
			{
				id: 'i2',
				studentId: 's1',
				involvedStudentIds: ['s1'],
				involvedCount: 1,
				date: '2026-03-01',
				category: 'Tardiness',
				severity: 'low',
				summary: 'B',
				status: 'open',
			},
			{
				id: 'i3',
				studentId: 's1',
				involvedStudentIds: ['s1'],
				involvedCount: 1,
				date: '2026-02-15',
				category: 'Conflict',
				severity: 'medium',
				summary: 'C',
				status: 'open',
			},
		]);

		expect(summary.sorted.map(incident => incident.id)).toEqual(['i2', 'i3', 'i1']);
		expect(summary).toMatchObject({ high: 1, med: 1, low: 1 });
	});

	it('computes finance totals for one student', () => {
		const billing: StudentBilling[] = [
			{
				id: 'b1',
				studentId: 's1',
				feeId: 'fee-1',
				total: 100,
				paid: 40,
				status: 'partial',
				dueDate: '2026-04-01',
				installments: [],
			},
			{
				id: 'b2',
				studentId: 's2',
				feeId: 'fee-2',
				total: 50,
				paid: 50,
				status: 'paid',
				dueDate: '2026-04-01',
				installments: [],
			},
		];

		expect(summarizeStudentFinances(billing, 's1')).toEqual({
			studentBilling: [billing[0]],
			total: 100,
			paid: 40,
			balance: 60,
		});
	});
});

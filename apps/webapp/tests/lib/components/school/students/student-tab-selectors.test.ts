import type { StudentBilling } from '$lib/types/school';
import { describe, expect, it } from 'bun:test';
import { buildStudentGradeSummaryFromRows } from '../../../../../src/routes/(app)/school/students/[[id]]/(tabs)/grades/student-grades-tab.selectors';
import { summarizeStudentFinances } from '../../../../../src/routes/(app)/school/students/[[id]]/(tabs)/finances/student-finance-tab.selectors';
import { summarizeStudentIncidents } from '../../../../../src/routes/(app)/school/students/[[id]]/(tabs)/incidents/student-incidents-tab.selectors';

describe('student tab selectors', () => {
	it('groups grades by subject and computes the weighted overall average', () => {
		const summary = buildStudentGradeSummaryFromRows([
			{
				assessmentId: '1',
				classGroupId: 'class-a',
				title: 'Quiz 1',
				subject: 'Math',
				kind: 'quiz',
				date: '2026-01-01',
				coefficient: 2,
				score: 20,
				outOf: 20,
			},
			{
				assessmentId: '2',
				classGroupId: 'class-a',
				title: 'Quiz 2',
				subject: 'Math',
				kind: 'quiz',
				date: '2026-01-02',
				coefficient: 1,
				score: 10,
				outOf: 20,
			},
			{
				assessmentId: '3',
				classGroupId: 'class-a',
				title: 'Quiz 3',
				subject: 'French',
				kind: 'quiz',
				date: '2026-01-03',
				coefficient: 1,
				score: null,
				outOf: 20,
			},
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

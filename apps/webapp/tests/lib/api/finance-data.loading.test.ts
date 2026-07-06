import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { loadFinanceData } from '$lib/api/finance-data';
import { createRecordingSchoolClient, entityListRequests } from '$tests/support/recording-school-client';

const academicYearId = 'year-1';

function listEnvelope<T>(items: readonly T[]) {
	return items.map(item => ({ data: item }));
}

describe('finance data loading', () => {
	it('loads the active-year student fee graph with referenced-id filters', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'fee-1',
				schoolId: SEED_SCHOOL_ID,
				name: 'Tuition',
				category: 'tuition',
				defaultAmount: 1000,
				installments: [],
			}]),
			listEnvelope([{
				id: 'enrollment-1',
				schoolId: SEED_SCHOOL_ID,
				studentId: 'student-1',
				classGroupId: 'class-6a',
				academicYearId,
				status: 'active',
			}]),
			listEnvelope([{
				id: 'student-1',
				schoolId: SEED_SCHOOL_ID,
				firstName: 'Ada',
				lastName: 'Lovelace',
				status: 'active',
			}]),
			listEnvelope([{
				id: 'student-fee-1',
				studentId: 'student-1',
				feeId: 'fee-1',
				expectedAmount: 1000,
				paidAmount: 500,
				status: 'partial',
				dueDate: '2026-06-30',
				installments: [],
			}]),
			listEnvelope([{
				id: 'payment-1',
				studentFeeId: 'student-fee-1',
				amount: 500,
				method: 'cash',
				status: 'completed',
			}]),
		]);

		const data = await loadFinanceData(client, {
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
		});

		expect(data.students.map(student => student.id)).toEqual(['student-1']);
		expect(data.billing.map(record => record.id)).toEqual(['student-fee-1']);
		expect(entityListRequests(requests, 'fees')[0]?.body).toEqual({
			schoolId: SEED_SCHOOL_ID,
		});
		expect(entityListRequests(requests, 'enrollments')[0]?.body).toEqual({
			academicYearId,
			status: 'active',
		});
		expect(entityListRequests(requests, 'students')[0]?.body).toEqual({
			id: { $in: ['student-1'] },
		});
		expect(entityListRequests(requests, 'student-fees')[0]?.body).toEqual({
			studentId: { $in: ['student-1'] },
		});
		expect(entityListRequests(requests, 'payments')[0]?.body).toEqual({
			studentFeeId: { $in: ['student-fee-1'] },
		});
	});
});

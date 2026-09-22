import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import {
	loadBillingPageData,
	loadFeesPageData,
	loadPaymentPageData,
} from '$lib/api/finance-data';
import { createRecordingSchoolClient, entityListRequests } from '$tests/support/recording-school-client';

const academicYearId = 'year-1';

function listEnvelope<T>(items: readonly T[]) {
	return items.map(item => ({ data: item }));
}

const catalogService = {
	id: 'fee-1',
	schoolId: SEED_SCHOOL_ID,
	academicYearId,
	name: 'Tuition',
	category: 'tuition',
	defaultPrice: 1000,
	currency: 'XOF',
	status: 'active',
	enrollmentMode: 'mandatory',
	billingTerms: { kind: 'one_time', installments: [] },
};

const charge = {
	id: 'charge-1',
	studentId: 'student-1',
	enrollmentId: 'enr-1',
	catalogServiceId: 'fee-1',
	label: 'Tuition',
	expectedAmount: 1000,
	allocatedAmount: 500,
	currency: 'XOF',
	status: 'partial',
	dueDate: '2026-06-30',
	academicYearId,
	installments: [],
};

const payment = {
	id: 'payment-1',
	accountId: 'sya-1',
	academicYearId,
	amount: 500,
	currency: 'XOF',
	paymentDate: '2026-01-15',
	method: 'cash',
	status: 'recorded',
	kind: 'receipt',
};

const yearAccount = {
	id: 'sya-1',
	studentId: 'student-1',
	academicYearId,
	currency: 'XOF',
	availableBalance: 0,
};

const enrollment = {
	id: 'enr-1',
	studentId: 'student-1',
	catalogServiceId: 'fee-1',
	academicYearId,
	status: 'active',
};

const student = {
	id: 'student-1',
	schoolId: SEED_SCHOOL_ID,
	firstName: 'Ada',
	lastName: 'Lovelace',
	status: 'active',
};

const classEnrollment = {
	id: 'enrollment-1',
	schoolId: SEED_SCHOOL_ID,
	studentId: 'student-1',
	classGroupId: 'class-6a',
	academicYearId,
	status: 'active',
};

describe('finance data loading', () => {
	it('loads only catalog services for the fees page', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([catalogService]),
		]);

		const data = await loadFeesPageData(client, {
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
		});

		expect(data.fees.map(fee => fee.id)).toEqual(['fee-1']);
		expect(entityListRequests(requests, 'catalog-services')).toHaveLength(1);
		expect(entityListRequests(requests, 'student-charges')).toHaveLength(0);
		expect(entityListRequests(requests, 'payments')).toHaveLength(0);
	});

	it('loads charges, catalog, year accounts, and enrollments for billing', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([catalogService]),
			listEnvelope([charge]),
			listEnvelope([yearAccount]),
			listEnvelope([enrollment]),
			listEnvelope([student]),
			listEnvelope([classEnrollment]),
		]);

		const data = await loadBillingPageData(client, {
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
		});

		expect(data.billing.map(record => record.id)).toEqual(['charge-1']);
		expect(data.billing[0]?.catalogServiceId).toBe('fee-1');
		expect(data.students.map(entry => entry.id)).toEqual(['student-1']);
		expect(entityListRequests(requests, 'catalog-services')[0]?.body).toEqual({
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
			$limit: 500,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'student-charges')[0]?.body).toEqual({
			academicYearId,
			$limit: 500,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'student-year-accounts')[0]?.body).toEqual({
			academicYearId,
			$limit: 500,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'student-service-enrollments')[0]?.body).toEqual({
			academicYearId,
			status: 'active',
			$limit: 500,
			$offset: 0,
		});
	});

	it('loads payments, year accounts, and charges for the payments page', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([payment]),
			listEnvelope([yearAccount]),
			listEnvelope([charge]),
			listEnvelope([enrollment]),
			listEnvelope([student]),
			listEnvelope([classEnrollment]),
		]);

		const data = await loadPaymentPageData(client, {
			schoolId: SEED_SCHOOL_ID,
			academicYearId,
		});

		expect(data.payments.map(entry => entry.id)).toEqual(['payment-1']);
		expect(data.payments[0]?.studentId).toBe('student-1');
		expect(data.billing.map(entry => entry.id)).toEqual(['charge-1']);
		expect(entityListRequests(requests, 'payments')[0]?.body).toEqual({
			academicYearId,
			$limit: 500,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'student-year-accounts')[0]?.body).toEqual({
			academicYearId,
			$limit: 500,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'student-charges')[0]?.body).toEqual({
			academicYearId,
			$limit: 500,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'student-service-enrollments')[0]?.body).toEqual({
			academicYearId,
			status: 'active',
			$limit: 500,
			$offset: 0,
		});
		expect(entityListRequests(requests, 'students')[0]?.body).toEqual({
			id: { $in: ['student-1'] },
			$limit: 500,
			$offset: 0,
		});
	});
});

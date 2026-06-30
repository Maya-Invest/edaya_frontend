import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Fee, Student, StudentBilling } from '$lib/types/school';
import {
	activeEnrollmentsForYear,
	entitiesByIds,
	paymentsForStudentFees,
	studentFeesForStudents,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { mapPeopleData } from '$lib/api/people-data';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type FeeRaw = components['schemas']['Fee'];
type StudentFeeRaw = components['schemas']['StudentFee'];
type PaymentRaw = components['schemas']['Payment'];
type StudentRaw = components['schemas']['Student'];
type EnrollmentRaw = components['schemas']['StudentClassEnrollment'];

function moneyAmount(value: unknown): number {
	if (typeof value === 'number') {
		return value;
	}
	if (value && typeof value === 'object' && 'amount' in value) {
		const amount = (value as { amount: unknown }).amount;
		return typeof amount === 'number' ? amount : 0;
	}
	return 0;
}

export interface FinanceSources {
	feesRaw: FeeRaw[];
	studentFeesRaw: StudentFeeRaw[];
	paymentsRaw: PaymentRaw[];
	studentsRaw: StudentRaw[];
	enrollmentsRaw: EnrollmentRaw[];
}

const FEE_CATEGORY_LABELS: Record<string, Fee['category']> = {
	tuition: 'Tuition',
	transport: 'Transport',
	uniform: 'Materials',
	other: 'Activities',
};

function feeCategoryLabel(fee: FeeRaw): Fee['category'] {
	if (fee.category === 'other') {
		const name = fee.name.toLowerCase();
		if (name.includes('cafeteria') || name.includes('meal')) {
			return 'Meals';
		}
		if (name.includes('textbook') || name.includes('material')) {
			return 'Materials';
		}
		if (name.includes('sport') || name.includes('club')) {
			return 'Activities';
		}
		return 'Activities';
	}

	return FEE_CATEGORY_LABELS[fee.category] ?? 'Activities';
}

function feePeriodLabel(fee: FeeRaw): Fee['period'] {
	if (fee.installments.length === 0) {
		return 'Month';
	}
	if (fee.installments.length === 1) {
		return 'Term';
	}
	return 'Year';
}

function mapBillingStatus(status: StudentFeeRaw['status']): StudentBilling['status'] {
	switch (status) {
		case 'paid':
			return 'paid';
		case 'partial':
			return 'partial';
		case 'overdue':
			return 'overdue';
		default:
			return 'due';
	}
}

function formatDate(value: unknown): string {
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

function mapInstallments(studentFee: StudentFeeRaw): StudentBilling['installments'] {
	let paidRemaining = moneyAmount(studentFee.paidAmount);

	return studentFee.installments.map((installment) => {
		const amount = moneyAmount(installment.expectedAmount);
		let status: 'paid' | 'pending' = 'pending';
		if (paidRemaining >= amount) {
			status = 'paid';
			paidRemaining -= amount;
		}

		return {
			date: formatDate(installment.dueDate),
			amount,
			status,
		};
	});
}

export async function fetchFinanceSources(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
): Promise<FinanceSources> {
	const [feesRaw, enrollmentsRaw] = await Promise.all([
		client.entities.fees.list({ schoolId: scope.schoolId }),
		client.entities.enrollments.list(activeEnrollmentsForYear(scope.academicYearId)),
	]);
	const studentIds = uniqueIds((enrollmentsRaw ?? []).map(enrollment => enrollment.studentId));
	const [studentsRaw, studentFeesRaw] = studentIds.length > 0
		? await Promise.all([
				client.entities.students.list(entitiesByIds(studentIds)),
				client.entities.studentFees.list(studentFeesForStudents(studentIds)),
			])
		: [[], []];
	const studentFeeIds = uniqueIds((studentFeesRaw ?? []).map(studentFee => studentFee.id));
	const paymentsRaw = studentFeeIds.length > 0
		? await client.entities.payments.list(paymentsForStudentFees(studentFeeIds))
		: [];

	return {
		feesRaw: feesRaw ?? [],
		studentFeesRaw: studentFeesRaw ?? [],
		paymentsRaw: paymentsRaw ?? [],
		studentsRaw: studentsRaw ?? [],
		enrollmentsRaw: enrollmentsRaw ?? [],
	};
}

export function mapFees(feesRaw: FeeRaw[]): Fee[] {
	return feesRaw
		.map(fee => ({
			id: fee.id,
			name: fee.name,
			category: feeCategoryLabel(fee),
			amount: moneyAmount(fee.defaultAmount),
			period: feePeriodLabel(fee),
		}))
		.sort((left, right) => left.name.localeCompare(right.name, 'fr'));
}

export function mapStudentBilling(studentFeesRaw: StudentFeeRaw[]): StudentBilling[] {
	return studentFeesRaw
		.map(studentFee => ({
			id: studentFee.id,
			studentId: studentFee.studentId,
			feeId: studentFee.feeId,
			total: moneyAmount(studentFee.expectedAmount),
			paid: moneyAmount(studentFee.paidAmount),
			status: mapBillingStatus(studentFee.status),
			dueDate: formatDate(studentFee.dueDate),
			installments: mapInstallments(studentFee),
		}))
		.sort((left, right) => left.dueDate.localeCompare(right.dueDate));
}

export async function loadFinanceData(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
): Promise<{ fees: Fee[]; billing: StudentBilling[]; students: Student[] }> {
	const sources = await fetchFinanceSources(client, scope);
	const { students } = mapPeopleData({
		studentsRaw: sources.studentsRaw,
		enrollmentsRaw: sources.enrollmentsRaw,
		guardiansRaw: [],
		linksRaw: [],
	});
	return {
		fees: mapFees(sources.feesRaw),
		billing: mapStudentBilling(sources.studentFeesRaw),
		students,
	};
}

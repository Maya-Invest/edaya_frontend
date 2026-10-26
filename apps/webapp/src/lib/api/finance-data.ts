import type {
	AccountStatement,
	CatalogServiceCategory,
	CatalogServiceRecord,
	CatalogServiceStatus,
	ChargeStatus,
	FinanceReconciliation,
	PaymentKind,
	PaymentRecord,
	PaymentSettlementHistory,
	PaymentStatus,
	StudentChargeRecord,
	StudentFinanceSummary,
	StudentServiceEnrollmentRecord,
	StudentYearAccountRecord,
} from '$lib/api/finance-types';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Fee, Student, StudentBilling } from '$lib/types/school';
import {
	listAllEntityPages,
	listAllEntityPagesByIds,
	listAllEntityPagesForIdFilters,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import {
	catalogServicesEntity,
	financeQuery,
	paymentsEntity,
	studentChargesEntity,
	studentServiceEnrollmentsEntity,
	studentYearAccountsEntity,
} from '$lib/api/finance-client';
import { mapPeopleData } from '$lib/api/people-data';
import { safeOptionalEntityList, safeOptionalFetch } from '$lib/api/safe-entity-access';
import { formatDateInput } from '$lib/date/format';
import { parseAutoBilling } from '$lib/finance/auto-billing';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

export interface FinancePayment {
	notes?: string;
	reversesPaymentId?: string;
	reversedByPaymentId?: string;
	classId?: string;
	studentName?: string;
	hasActiveAllocations?: boolean;
	reversedAt?: string;
	reversedById?: string;
	recordedById?: string;

	id: string;
	accountId: string;
	studentId: string;
	academicYearId: string;
	amount: number;
	currency: string;
	paymentDate: string;
	status: PaymentStatus;
	kind: PaymentKind;
	method: string;
	reference?: string;
}

export interface StudentYearAccountView {
	id: string;
	studentId: string;
	academicYearId: string;
	currency: string;
	availableBalance: number;
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function moneyAmount(value: unknown): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return Math.trunc(value);
	}
	if (value && typeof value === 'object' && 'amount' in value) {
		const amount = (value as { amount: unknown }).amount;
		return typeof amount === 'number' && Number.isFinite(amount) ? Math.trunc(amount) : 0;
	}
	return 0;
}

export function moneyCurrency(value: unknown): string {
	if (typeof value === 'string' && value.trim()) {
		return value.trim();
	}
	if (value && typeof value === 'object' && 'currency' in value) {
		const currency = (value as { currency: unknown }).currency;
		if (typeof currency === 'string' && currency.trim()) {
			return currency.trim();
		}
	}
	throw new Error('A financial record is missing its currency');
}

/** Domain entities serialize money as `{ amount, currency }` without a sibling currency field. */
function currencyOf(record: Record<string, unknown>, ...amountKeys: string[]): string {
	if (typeof record.currency === 'string' && record.currency.trim()) {
		return record.currency.trim();
	}
	for (const key of amountKeys) {
		const amount = record[key];
		if (amount && typeof amount === 'object' && 'currency' in amount) {
			return moneyCurrency((amount as { currency: unknown }).currency);
		}
	}
	return moneyCurrency(record.currency);
}

function stringField(value: unknown, fallback = ''): string {
	return typeof value === 'string' ? value : fallback;
}

const CATEGORIES = new Set<CatalogServiceCategory>([
	'tuition',
	'transport',
	'meals',
	'activities',
	'materials',
	'other',
]);

function mapCategory(value: unknown): CatalogServiceCategory {
	if (typeof value === 'string' && CATEGORIES.has(value as CatalogServiceCategory)) {
		return value as CatalogServiceCategory;
	}
	if (value === 'uniform') {
		return 'materials';
	}
	return 'other';
}

function mapCatalogStatus(value: unknown): CatalogServiceStatus {
	if (value === 'draft' || value === 'active' || value === 'archived') {
		return value;
	}
	return 'draft';
}

function mapChargeStatus(value: unknown): ChargeStatus {
	if (
		value === 'pending'
		|| value === 'partial'
		|| value === 'paid'
		|| value === 'overdue'
		|| value === 'cancelled'
		|| value === 'waived'
	) {
		return value;
	}
	if (value === 'due') {
		return 'pending';
	}
	return 'pending';
}

function mapPaymentStatus(value: unknown): PaymentStatus {
	return value === 'reversed' ? 'reversed' : 'recorded';
}

function mapPaymentKind(value: unknown): PaymentKind {
	return value === 'disbursement' ? 'disbursement' : 'receipt';
}

export function mapFees(raw: readonly unknown[]): Fee[] {
	return raw
		.map((entry) => {
			const fee = asRecord(entry);
			const amount = moneyAmount(fee.defaultPrice);
			const currency = currencyOf(fee, 'defaultPrice');
			const terms = asRecord(fee.billingTerms);
			const installments = Array.isArray(terms.installments) ? terms.installments : [];
			return {
				id: stringField(fee.id),
				academicYearId: stringField(fee.academicYearId),
				description: stringField(fee.description),
				billingTerms: fee.billingTerms as CatalogServiceRecord['billingTerms'],
				name: stringField(fee.name),
				category: mapCategory(fee.category),
				amount,
				currency,
				status: mapCatalogStatus(fee.status),
				autoBilling: parseAutoBilling(fee.autoBilling),
				installmentCount: installments.length,
			} satisfies Fee;
		})
		.filter(fee => fee.id.length > 0)
		.sort((left, right) => left.name.localeCompare(right.name, 'fr'));
}

function mapInstallments(charge: StudentChargeRecord): StudentBilling['installments'] {
	let allocatedRemaining = moneyAmount(charge.allocatedAmount);
	const installments = charge.installments ?? [];
	return [...installments].sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.id.localeCompare(b.id)).map((installment) => {
		const amount = moneyAmount(installment.expectedAmount);
		const applied = Math.min(amount, allocatedRemaining);
		allocatedRemaining -= applied;
		const status = applied >= amount && amount > 0 ? 'paid' : applied > 0 ? 'partial' : 'pending';
		return { id: installment.id, date: formatDateInput(installment.dueDate), amount, label: installment.label, status, applied, remaining: amount - applied };
	});
}

export function mapStudentBilling(raw: readonly unknown[]): StudentBilling[] {
	return raw
		.map((entry) => {
			const charge = asRecord(entry) as unknown as StudentChargeRecord;
			const expected = moneyAmount(charge.expectedAmount);
			const allocated = moneyAmount(charge.allocatedAmount);
			const adjustment = moneyAmount(charge.adjustmentAmount);
			const waiver = moneyAmount(charge.waiverAmount);
			const net = Math.max(0, expected - adjustment - waiver);
			const remaining = charge.status === 'cancelled' ? 0 : Math.max(0, net - allocated);
			return {
				id: stringField(charge.id),
				studentName: charge.studentName,
				classId: charge.classId ?? undefined,
				netAmount: charge.status === 'cancelled' ? 0 : net,
				adjustmentAmount: adjustment,
				waiverAmount: waiver,
				accountId: charge.accountId ?? undefined,
				availableCredit: charge.availableCredit,
				overdue: charge.overdue,
				adjustmentReason: charge.adjustmentReason ?? undefined,
				adjustedAt: charge.adjustedAt ?? undefined,
				adjustedById: charge.adjustedById ?? undefined,
				waiverReason: charge.waiverReason ?? undefined,
				waivedAt: charge.waivedAt ?? undefined,
				waivedById: charge.waivedById ?? undefined,
				cancellationReason: charge.cancellationReason ?? undefined,
				cancelledAt: charge.cancelledAt ?? undefined,
				cancelledById: charge.cancelledById ?? undefined,
				createdAt: charge.createdAt ?? undefined,

				studentId: stringField(charge.studentId),
				enrollmentId: stringField(charge.enrollmentId),
				catalogServiceId: stringField(charge.catalogServiceId),
				label: stringField(charge.label),
				total: expected,
				paid: allocated,
				remaining,
				currency: currencyOf(charge as unknown as Record<string, unknown>, 'expectedAmount'),
				status: mapChargeStatus(charge.status),
				dueDate: formatDateInput(charge.dueDate),
				academicYearId: stringField(charge.academicYearId),
				installments: mapInstallments(charge),
			} satisfies StudentBilling;
		})
		.filter(row => row.id.length > 0)
		.sort((left, right) => left.dueDate.localeCompare(right.dueDate));
}

export function mapPayments(raw: readonly unknown[]): FinancePayment[] {
	return raw
		.map((entry) => {
			const payment = asRecord(entry) as unknown as PaymentRecord;
			return {
				id: stringField(payment.id),
				studentName: stringField(asRecord(entry).studentName),
				classId: stringField(asRecord(entry).classId) || undefined,
				hasActiveAllocations: asRecord(entry).hasActiveAllocations === true,
				reversedAt: stringField(asRecord(entry).reversedAt),
				reversedById: stringField(asRecord(entry).reversedById),
				recordedById: stringField(asRecord(entry).recordedById),
				accountId: stringField(payment.accountId),
				studentId: stringField(asRecord(entry).studentId),
				academicYearId: stringField(payment.academicYearId),
				amount: moneyAmount(payment.amount),
				currency: currencyOf(payment as unknown as Record<string, unknown>, 'amount'),
				paymentDate: formatDateInput(payment.paymentDate),
				status: mapPaymentStatus(payment.status),
				kind: mapPaymentKind(payment.kind),
				method: stringField(payment.method, 'other'),
				reference: payment.reference ?? undefined,
				notes: payment.notes ?? undefined,
				reversesPaymentId: stringField(asRecord(entry).reversesPaymentId) || undefined,
				reversedByPaymentId: stringField(asRecord(entry).reversedByPaymentId) || undefined,
			} satisfies FinancePayment;
		})
		.filter(payment => payment.id.length > 0)
		.sort((left, right) => right.paymentDate.localeCompare(left.paymentDate));
}

export function mapYearAccounts(raw: readonly unknown[]): StudentYearAccountView[] {
	return raw
		.map((entry) => {
			const account = asRecord(entry) as unknown as StudentYearAccountRecord;
			return {
				id: stringField(account.id),
				studentId: stringField(account.studentId),
				academicYearId: stringField(account.academicYearId),
				currency: currencyOf(account as unknown as Record<string, unknown>, 'availableBalance'),
				availableBalance: moneyAmount(account.availableBalance),
			} satisfies StudentYearAccountView;
		})
		.filter(account => account.id.length > 0);
}

function mapStudents(studentsRaw: unknown[], enrollmentsRaw: unknown[]): Student[] {
	return mapPeopleData({
		studentsRaw: studentsRaw as never,
		enrollmentsRaw: enrollmentsRaw as never,
		guardiansRaw: [],
		linksRaw: [],
	}).students;
}

export async function listCatalogServices(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
): Promise<Fee[]> {
	const raw = await safeOptionalEntityList(() => listAllEntityPages(
		query => catalogServicesEntity(client).list(query),
		{ baseQuery: { schoolId: scope.schoolId, academicYearId: scope.academicYearId } },
	));
	return mapFees(raw as CatalogServiceRecord[]);
}

export async function listStudentCharges(
	client: SchoolClient,
	scope: { academicYearId: string },
): Promise<StudentBilling[]> {
	const raw = await safeOptionalEntityList(() => listAllEntityPages(
		query => studentChargesEntity(client).list(query),
		{ baseQuery: { academicYearId: scope.academicYearId } },
	));
	return mapStudentBilling(raw as StudentChargeRecord[]);
}

export async function listYearPayments(
	client: SchoolClient,
	scope: { academicYearId: string },
): Promise<FinancePayment[]> {
	const raw = await safeOptionalEntityList(() => listAllEntityPages(
		query => paymentsEntity(client).list(query),
		{ baseQuery: { academicYearId: scope.academicYearId } },
	));
	return mapPayments(raw);
}

export async function listYearAccounts(
	client: SchoolClient,
	scope: { academicYearId: string },
): Promise<StudentYearAccountView[]> {
	const raw = await safeOptionalEntityList(() => listAllEntityPages(
		query => studentYearAccountsEntity(client).list(query),
		{ baseQuery: { academicYearId: scope.academicYearId } },
	));
	return mapYearAccounts(raw);
}

export async function listServiceEnrollments(
	client: SchoolClient,
	scope: { academicYearId: string },
): Promise<StudentServiceEnrollmentRecord[]> {
	const raw = await safeOptionalEntityList(() => listAllEntityPages(
		query => studentServiceEnrollmentsEntity(client).list(query),
		{ baseQuery: { academicYearId: scope.academicYearId } },
	));
	return raw as StudentServiceEnrollmentRecord[];
}

export async function loadStudentsByIds(
	client: SchoolClient,
	studentIds: readonly string[],
	academicYearId: string,
): Promise<Student[]> {
	if (studentIds.length === 0) {
		return [];
	}
	const [studentsRaw, enrollmentsRaw] = await Promise.all([
		safeOptionalEntityList(() => listAllEntityPagesByIds(
			query => client.entities.students.list(query),
			studentIds,
		)),
		safeOptionalEntityList(() => listAllEntityPagesForIdFilters(
			query => client.entities.enrollments.list(query),
			[{ field: 'studentId', ids: studentIds }],
			{ extraQuery: { academicYearId, status: 'active' } },
		)),
	]);
	return mapStudents(studentsRaw, enrollmentsRaw);
}

export async function loadFeesPageData(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
): Promise<{ fees: Fee[] }> {
	return { fees: await listCatalogServices(client, scope) };
}

function hydrateChargeCatalogIds(
	billing: StudentBilling[],
	enrollments: readonly StudentServiceEnrollmentRecord[],
): StudentBilling[] {
	const enrollmentById = new Map(enrollments.map(enrollment => [enrollment.id, enrollment]));
	return billing.map((row) => {
		const catalogServiceId = row.catalogServiceId
			|| enrollmentById.get(row.enrollmentId)?.catalogServiceId
			|| '';
		return catalogServiceId === row.catalogServiceId ? row : { ...row, catalogServiceId };
	});
}

export async function loadBillingPageData(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
): Promise<{ fees: Fee[]; billing: StudentBilling[]; students: Student[]; accounts: StudentYearAccountView[] }> {
	const [fees, billing, accounts, enrollments] = await Promise.all([
		listCatalogServices(client, scope),
		listStudentCharges(client, scope),
		listYearAccounts(client, scope),
		listServiceEnrollments(client, scope),
	]);
	const hydratedBilling = hydrateChargeCatalogIds(billing, enrollments);
	const students = await loadStudentsByIds(
		client,
		uniqueIds(hydratedBilling.map(row => row.studentId)),
		scope.academicYearId,
	);
	return { fees, billing: hydratedBilling, students, accounts };
}

export async function loadPaymentPageData(
	client: SchoolClient,
	scope: { schoolId: string; academicYearId: string },
): Promise<{
	payments: FinancePayment[];
	students: Student[];
	accounts: StudentYearAccountView[];
	billing: StudentBilling[];
}> {
	const [payments, accounts, billing, enrollments] = await Promise.all([
		listYearPayments(client, scope),
		listYearAccounts(client, scope),
		listStudentCharges(client, scope),
		listServiceEnrollments(client, scope),
	]);
	const accountById = new Map(accounts.map(account => [account.id, account]));
	const hydrated = payments.map((payment) => {
		const account = accountById.get(payment.accountId);
		return {
			...payment,
			studentId: account?.studentId ?? payment.studentId,
			currency: payment.currency,
		};
	});
	const students = await loadStudentsByIds(
		client,
		uniqueIds(hydrated.map(payment => payment.studentId).filter(Boolean)),
		scope.academicYearId,
	);
	return {
		payments: hydrated,
		students,
		accounts,
		billing: hydrateChargeCatalogIds(billing, enrollments),
	};
}

export async function loadStudentFinanceSummary(
	client: SchoolClient,
	input: { studentId: string; academicYearId: string },
): Promise<StudentFinanceSummary | null> {
	return safeOptionalFetch(
		() => financeQuery<StudentFinanceSummary>(
			client,
			'getStudentFinanceSummary',
			'get-student-finance-summary',
			input,
		),
		null,
	);
}

export async function loadStudentAccountStatement(
	client: SchoolClient,
	input: { studentId: string; academicYearId: string; currency?: string },
): Promise<AccountStatement | null> {
	return safeOptionalFetch(
		() => financeQuery<AccountStatement>(
			client,
			'getStudentAccountStatement',
			'get-student-account-statement',
			input,
		),
		null,
	);
}

export async function loadFinanceReconciliation(
	client: SchoolClient,
	input: { schoolId: string; academicYearId?: string },
): Promise<FinanceReconciliation | null> {
	return safeOptionalFetch(
		() => financeQuery<FinanceReconciliation>(
			client,
			'getFinanceReconciliation',
			'get-finance-reconciliation',
			input,
		),
		null,
	);
}

export async function loadPaymentSettlementHistory(
	client: SchoolClient,
	input: { accountId: string },
): Promise<PaymentSettlementHistory | null> {
	return safeOptionalFetch(
		() => financeQuery<PaymentSettlementHistory>(
			client,
			'getPaymentSettlementHistory',
			'get-payment-settlement-history',
			input,
		),
		null,
	);
}

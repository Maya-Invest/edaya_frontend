export type CatalogServiceCategory
	= | 'tuition'
		| 'transport'
		| 'meals'
		| 'activities'
		| 'materials'
		| 'other';

export type CatalogServiceStatus = 'draft' | 'active' | 'archived';
export type AutoBillingConfiguration = { mode: 'off' | 'all' } | { mode: 'matching'; gradeLevelIds: string[] | null; placementStatusIds: string[] | null };
export type ChargeStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'waived';
export type PaymentKind = 'receipt' | 'disbursement';
export type PaymentStatus = 'recorded' | 'reversed';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'other';
export type AllocationMode = 'account_only' | 'fifo' | 'targeted';

export interface MoneyValue {
	amount: number;
	currency: string;
}

export interface CatalogInstallmentTemplate {
	label: string;
	percentage: number;
	dueDate?: string | null;
}

export interface OneTimeBillingTerms {
	kind: 'one_time';
	installments?: CatalogInstallmentTemplate[];
	singleDueDate?: string | null;
}

export interface CatalogServiceRecord {
	id: string;
	schoolId?: string;
	academicYearId: string;
	name: string;
	description?: string | null;
	category: CatalogServiceCategory;
	autoBilling: AutoBillingConfiguration;
	billingKind?: 'one_time';
	defaultPrice: number | MoneyValue;
	currency: string;
	billingTerms: OneTimeBillingTerms;
	status: CatalogServiceStatus;
}

export interface ChargeInstallmentRecord {
	id: string;
	label: string;
	expectedAmount: number | MoneyValue;
	dueDate?: string | null;
}

export interface StudentChargeRecord {
	classId?: string;
	studentName?: string;
	accountId?: string;
	availableCredit?: number;
	overdue?: number;
	adjustmentReason?: string;
	adjustedAt?: string;
	adjustedById?: string;
	waiverReason?: string;
	waivedAt?: string;
	waivedById?: string;
	cancellationReason?: string;
	cancelledAt?: string;
	cancelledById?: string;
	createdAt?: string;

	id: string;
	schoolId?: string;
	studentId: string;
	enrollmentId: string;
	catalogServiceId?: string;
	academicYearId: string;
	label: string;
	expectedAmount: number | MoneyValue;
	allocatedAmount?: number | MoneyValue;
	adjustmentAmount?: number | MoneyValue;
	waiverAmount?: number | MoneyValue;
	currency: string;
	dueDate?: string | null;
	status: ChargeStatus;
	installments?: ChargeInstallmentRecord[];
}

export interface StudentYearAccountRecord {
	id: string;
	schoolId?: string;
	studentId: string;
	academicYearId: string;
	currency: string;
	availableBalance: number | MoneyValue;
}

export interface PaymentRecord {
	id: string;
	schoolId?: string;
	accountId: string;
	academicYearId: string;
	kind: PaymentKind;
	amount: number | MoneyValue;
	currency: string;
	paymentDate: string;
	method: PaymentMethod;
	status: PaymentStatus;
	reference?: string | null;
	notes?: string | null;
}

export interface StudentServiceEnrollmentRecord {
	id: string;
	studentId: string;
	catalogServiceId: string;
	academicYearId: string;
	status: 'active' | 'cancelled';
}

export interface AllocationPlan {
	mode: AllocationMode;
	targets?: { chargeId: string; amount: number }[];
}

export interface AllocationPreview {
	accountId: string;
	availableBefore: number;
	availableAfter: number;
	allocations: { chargeId: string; amount: number; label: string }[];
}

export interface StudentFinanceSummary {
	studentId: string;
	academicYearId: string;
	accountId?: string;
	currency: string;
	available: MoneyValue;
	outstanding: MoneyValue;
	overdue: MoneyValue;
}

export interface AccountStatementEntry {
	id: string;
	direction: string;
	amount: number;
	sourceKind: string;
	sourceId: string;
	effectiveAt: string;
	recordedAt: string;
	resultingAvailableBalance: number;
}

export interface AccountStatement {
	accountId: string;
	studentId: string;
	academicYearId: string;
	currency: string;
	projectedAvailable: number;
	entrySum: number;
	entries: AccountStatementEntry[];
	payments: {
		id: string;
		kind: string;
		amount: number;
		status: string;
		paymentDate: string;
		method: string;
		reference?: string;
	}[];
	allocations: {
		id: string;
		chargeId: string;
		amount: number;
		kind: string;
	}[];
	charges: {
		id: string;
		label: string;
		remainingObligation: number;
		status: string;
	}[];
}

export interface PaymentSettlementHistory {
	accountId: string;
	studentId: string;
	academicYearId: string;
	currency: string;
	payments: AccountStatement['payments'];
	allocations: {
		id: string;
		chargeId: string;
		amount: number;
		kind: string;
		causedByPaymentId?: string;
		reversesAllocationId?: string;
		recordedAt: string;
	}[];
}

export function activeSettleAllocations(
	allocations: PaymentSettlementHistory['allocations'],
	chargeId: string,
): PaymentSettlementHistory['allocations'] {
	const reversed = new Set(
		allocations
			.filter(row => row.kind === 'reverse' && row.reversesAllocationId)
			.map(row => row.reversesAllocationId as string),
	);
	return allocations.filter(row =>
		row.chargeId === chargeId
		&& row.kind === 'settle'
		&& !reversed.has(row.id),
	);
}

export interface FinanceReconciliation {
	schoolId: string;
	academicYearId?: string;
	balanced: boolean;
	accounts: {
		accountId: string;
		studentId: string;
		projectedAvailable: number;
		entrySum: number;
		difference: number;
	}[];
	charges: {
		chargeId: string;
		studentId: string;
		projectedAllocated: number;
		settlement: number;
		difference: number;
	}[];
}

export interface SchoolFinanceAging {
	schoolId: string;
	academicYearId?: string;
	currency: string;
	overdueCount: number;
	overdueAmount: number;
	outstandingAmount: number;
}

export const CATALOG_CATEGORIES: CatalogServiceCategory[] = [
	'tuition',
	'transport',
	'meals',
	'activities',
	'materials',
	'other',
];

export const FINANCE_BATCH_ENROLL_LIMIT = 100;

export interface FinanceOverview {
	schoolId: string;
	academicYearId: string;
	currency: string;
	scope: 'authorized';
	received: number;
	refunded: number;
	netCollected: number;
	outstanding: number;
	overdue: number;
	overdueStudents: number;
	availableCredit: number;
	studentsAssigned: number;
	netBilled: number;
	applied: number;
}

import { describe, expect, test } from 'bun:test';
import { mapStudentBilling } from '$lib/api/finance-data';
import { activeSettleAllocations, type PaymentSettlementHistory } from '$lib/api/finance-types';
import { billingHistory } from '$lib/finance/billing-history';
import { canAccessPath } from '$lib/navigation/nav-permissions';
import type { ActionGrantsSnapshot } from '$lib/auth/types';

const captured = { id: 'charge', studentId: 'student', enrollmentId: 'cancelled-enrollment', catalogServiceId: 'archived-fee', academicYearId: 'year', label: 'Captured tuition', expectedAmount: 1000, allocatedAmount: 250, adjustmentAmount: 100, waiverAmount: 50, currency: 'USD', status: 'partial', createdAt: '2026-01-01T00:00:00Z', adjustedAt: '2026-02-01T00:00:00Z', adjustedById: 'cashier', adjustmentReason: 'Scholarship', installments: [{ id: 'first', label: 'First', expectedAmount: 500, dueDate: '2026-01-15' }, { id: 'second', label: 'Second', expectedAmount: 500, dueDate: '2026-03-15' }] };

describe('finance restructuring', () => {
	test('partial attribution consumes allocations once and preserves original schedule and reductions', () => {
		const row = mapStudentBilling([captured])[0]!;
		expect(row).toMatchObject({ total: 1000, netAmount: 850, paid: 250, remaining: 600, catalogServiceId: 'archived-fee', adjustmentReason: 'Scholarship' });
		expect(row.installments).toMatchObject([{ status: 'partial', applied: 250, remaining: 250, amount: 500 }, { status: 'pending', applied: 0, remaining: 500, amount: 500 }]);
		expect(mapStudentBilling([{ ...captured, status: 'cancelled' }])[0]).toMatchObject({ netAmount: 0, remaining: 0 });
	});
	test('history contains only recorded facts and deterministic ordering, without inferred allocation actors', () => {
		const history: PaymentSettlementHistory = { accountId: 'account', studentId: 'student', academicYearId: 'year', currency: 'USD', payments: [], allocations: [{ id: 'b', chargeId: 'charge', amount: 250, kind: 'settle', recordedAt: '2026-02-02T00:00:00Z' }, { id: 'c', chargeId: 'charge', amount: 250, kind: 'reverse', reversesAllocationId: 'b', recordedAt: '2026-02-02T00:00:00Z' }, { id: 'other', chargeId: 'different-charge', amount: 900, kind: 'settle', recordedAt: '2026-02-03T00:00:00Z' }] };
		const events = billingHistory(mapStudentBilling([captured])[0]!, history);
		expect(events.map(row => row.id)).toEqual(['b', 'c', 'adjusted:charge', 'assigned:charge']);
		expect(events[0]?.actor).toBeUndefined();
		expect(events[2]?.actor).toBe('cashier');
		expect(activeSettleAllocations(history.allocations, 'charge')).toEqual([]);
	});
	test('catalog and report navigation do not imply operational payment access', () => {
		const grants = (permission: string) => [{ permission, scopes: [{ kind: 'school' }] }] as ActionGrantsSnapshot;
		expect(canAccessPath('/finance/fees', grants('FINANCIAL_CONFIG_READ'))).toBe(true);
		expect(canAccessPath('/finance/billing/charge/history', grants('FINANCIAL_CONFIG_READ'))).toBe(false);
		expect(canAccessPath('/finance/payment', grants('FINANCIAL_CONFIG_READ'))).toBe(false);
		expect(canAccessPath('/finance/fees', grants('PAYMENT_READ'))).toBe(true);
		expect(canAccessPath('/configuration/tools', grants('FINANCIAL_REPORT_READ'))).toBe(true);
		expect(canAccessPath('/configuration/tools/finance-checks', grants('FINANCIAL_REPORT_READ'))).toBe(true);
		expect(canAccessPath('/configuration/tools/finance-checks', grants('STUDENT_CREATE'))).toBe(false);
		expect(canAccessPath('/finance/reconciliation', grants('FINANCIAL_REPORT_READ'))).toBe(true);
	});
});

test('billing history compares instants across timestamp offsets', () => {
	const charge = mapStudentBilling([{ ...captured, createdAt: '2026-02-01T12:00:00Z', adjustedAt: '2026-02-01T08:30:00-04:00' }])[0]!;
	expect(billingHistory(charge, null).map(event => event.kind)).toEqual(['adjusted', 'assigned']);
});


test('cancellation history does not fabricate an unrecorded amount', () => {
	const charge = mapStudentBilling([{ ...captured, status: 'cancelled', cancelledAt: '2026-03-01T00:00:00Z', cancellationReason: 'Duplicate assignment' }])[0]!;
	const event = billingHistory(charge, null).find(row => row.kind === 'cancelled');
	expect(event?.amount).toBeUndefined();
	expect(event?.reason).toBe('Duplicate assignment');
});

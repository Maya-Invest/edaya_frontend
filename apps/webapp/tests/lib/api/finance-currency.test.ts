import { describe, expect, test } from 'bun:test';
import { mapFees, mapPayments, mapStudentBilling, mapYearAccounts, moneyCurrency } from '$lib/api/finance-data';
import { studentYearAccountSourceId } from '$lib/api/documents-source-ids';
import { formatMinorUnits } from '$lib/finance/money';

describe('explicit finance currency', () => {
  test('missing currency is not inferred from a record or a default', () => {
    expect(() => moneyCurrency(undefined)).toThrow('missing its currency');
    expect(() => mapPayments([{ id: 'p', accountId: 'a', amount: 1000 }])).toThrow('missing its currency');
    expect(() => studentYearAccountSourceId({ schoolId: 's', studentId: 'p', academicYearId: 'y', currency: '' })).toThrow('currency is required');
    expect(formatMinorUnits(0, '')).toBe('—');
  });
	test('configured currencies retain their amounts and explicit document identity', () => {
		expect(moneyCurrency('EUR')).toBe('EUR');
		expect(studentYearAccountSourceId({ schoolId: 's', studentId: 'p', academicYearId: 'y', currency: 'EUR' })).toBe('sya:s:p:y:EUR');
		expect(formatMinorUnits(1234, 'EUR', 'en-US')).toBe('€12.34');
	});
	test('entity money objects carry currency on the amount', () => {
		expect(mapFees([{ id: 'fee-1', name: 'Tuition', defaultPrice: { amount: 40000, currency: 'XOF' }, category: 'tuition', status: 'active' }])[0])
			.toMatchObject({ amount: 40000, currency: 'XOF' });
		expect(mapStudentBilling([{ id: 'ch-1', studentId: 's', enrollmentId: 'e', catalogServiceId: 'fee-1', label: 'Tuition', expectedAmount: { amount: 40000, currency: 'XOF' }, allocatedAmount: { amount: 0, currency: 'XOF' }, adjustmentAmount: { amount: 0, currency: 'XOF' }, waiverAmount: { amount: 0, currency: 'XOF' }, status: 'open', academicYearId: 'y' }])[0])
			.toMatchObject({ currency: 'XOF', total: 40000 });
		expect(mapPayments([{ id: 'p', accountId: 'a', amount: { amount: 1000, currency: 'XOF' }, academicYearId: 'y', paymentDate: '2026-01-01', status: 'completed', kind: 'receipt' }])[0])
			.toMatchObject({ amount: 1000, currency: 'XOF' });
		expect(mapYearAccounts([{ id: 'sya', studentId: 's', academicYearId: 'y', availableBalance: { amount: 500, currency: 'XOF' } }])[0])
			.toMatchObject({ availableBalance: 500, currency: 'XOF' });
	});
});

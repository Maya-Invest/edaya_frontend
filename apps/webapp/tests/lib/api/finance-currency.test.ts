import { describe, expect, test } from 'bun:test';
import { mapPayments, moneyCurrency } from '$lib/api/finance-data';
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
});

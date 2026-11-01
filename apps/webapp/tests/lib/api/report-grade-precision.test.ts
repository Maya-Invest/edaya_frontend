import { describe, expect, test } from 'bun:test';
import { formatGrade } from '../../../src/lib/types/report-cards';

describe('report grade precision', () => {
  test('a whole-number display scale cannot hide a fractional report average', () => {
    expect(formatGrade(12.75, { decimalPlaces: 0 })).toBe('12.75');
    expect(formatGrade(12.75, { decimalPlaces: 1 })).toBe('12.75');
  });
  test('no score remains distinct from numeric zero', () => {
    expect(formatGrade(undefined, { decimalPlaces: 2 })).toBe('—');
    expect(formatGrade(0, { decimalPlaces: 2 })).toBe('0.00');
  });
});

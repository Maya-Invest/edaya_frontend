import { describe, expect, it } from 'bun:test';
import { parseMajorInput } from '../../../src/lib/finance/money';

describe('parseMajorInput', () => {
	it('parses trimmed decimal strings', () => {
		expect(parseMajorInput('10 000')).toBe(10000);
		expect(parseMajorInput('12,5')).toBe(12.5);
	});

	it('accepts numeric values from type=number bindings', () => {
		expect(parseMajorInput(10000)).toBe(10000);
		expect(parseMajorInput(0)).toBe(0);
	});

	it('rejects empty and non-finite values', () => {
		expect(parseMajorInput('')).toBeNull();
		expect(parseMajorInput('   ')).toBeNull();
		expect(parseMajorInput(Number.NaN)).toBeNull();
		expect(parseMajorInput(null)).toBeNull();
		expect(parseMajorInput(undefined)).toBeNull();
	});
});

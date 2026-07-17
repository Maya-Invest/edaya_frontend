import { describe, expect, it } from 'bun:test';
import { normalizeHeader } from '$lib/import/shared/normalize-header';

describe('normalizeHeader', () => {
	it('trims whitespace and lowercases', () => {
		expect(normalizeHeader('  PrEnOm  ')).toBe('prenom');
	});

	it('strips a UTF-8 BOM', () => {
		expect(normalizeHeader('\uFEFFprenom')).toBe('prenom');
	});
});

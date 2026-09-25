import { describe, expect, it } from 'bun:test';
import { en } from '$lib/i18n/dictionaries/en';
import { fr } from '$lib/i18n/dictionaries/fr';

describe('translation dictionaries', () => {
	it('keeps English and French key sets aligned', () => {
		const enKeys = Object.keys(en).sort();
		const frKeys = Object.keys(fr).sort();
		expect(frKeys).toEqual(enKeys);
	});
});

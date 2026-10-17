import { PERMISSION_SCOPE_GRAINS } from '$lib/api/grant-scopes';
import { en } from '$lib/i18n/dictionaries/en';
import { fr } from '$lib/i18n/dictionaries/fr';
import { describe, expect, it } from 'bun:test';

describe('translation dictionaries', () => {
	it('keeps English and French key sets aligned', () => {
		const enKeys = Object.keys(en).sort();
		const frKeys = Object.keys(fr).sort();
		expect(frKeys).toEqual(enKeys);
	});
	it('labels every selectable resource scope in both languages', () => {
		for (const dict of [en, fr]) {
			for (const grain of PERMISSION_SCOPE_GRAINS) {
				expect(dict[`scope.grain.${grain}`]).toBeTruthy();
			}
			expect(dict['scope.allowedTypes']).toBeTruthy();
		}
	});
});

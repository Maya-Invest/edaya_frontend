import { describe, expect, it } from 'bun:test';
import { en } from '$lib/i18n/dictionaries/en';
import { fr } from '$lib/i18n/dictionaries/fr';

function collectDuplicateKeys(dict: Record<string, string>): string[] {
	const seen = new Set<string>();
	const duplicates: string[] = [];
	for (const key of Object.keys(dict)) {
		if (seen.has(key))
			duplicates.push(key);
		else
			seen.add(key);
	}
	return duplicates;
}

describe('translation dictionaries', () => {
	it('keeps English and French key sets aligned', () => {
		const enKeys = Object.keys(en).sort();
		const frKeys = Object.keys(fr).sort();
		expect(frKeys).toEqual(enKeys);
	});

	it('has no duplicate keys in English', () => {
		expect(collectDuplicateKeys(en)).toEqual([]);
	});

	it('has no duplicate keys in French', () => {
		expect(collectDuplicateKeys(fr)).toEqual([]);
	});
});

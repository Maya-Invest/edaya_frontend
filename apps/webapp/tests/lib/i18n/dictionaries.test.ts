import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

it('preserves interpolation placeholders across languages', () => {
	const placeholders = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]))].sort();
	for (const key of Object.keys(en)) {
		expect({ key, placeholders: placeholders(fr[key] ?? '') }).toEqual({ key, placeholders: placeholders(en[key]!) });
	}
});

it('resolves literal translation calls in maintained product source', () => {
	// Dynamic keys remain governed by feature catalog tests; this scans literal calls only.
	const missing: string[] = [];
	const files = new Bun.Glob('**/*.{ts,svelte}').scanSync({ cwd: resolve('src'), onlyFiles: true });
	for (const file of files) {
		const source = readFileSync(resolve('src', file), 'utf8');
		for (const match of source.matchAll(/(?:\$t|get\(t\))\(\s*(['"])([^'"\n]+)\1/g)) {
			const key = match[2]!;
			if (!(key in en) || !(key in fr))
				missing.push(`${file}: ${key}`);
		}
	}
	expect(missing).toEqual([]);
});

import { describe, expect, test } from 'bun:test';
import { en } from '$lib/i18n/dictionaries/en';
import { fr } from '$lib/i18n/dictionaries/fr';

const LIST_SHELL_KEYS = [
	'list.filter',
	'list.filters',
	'list.moreActions',
	'list.export',
	'list.exportSoon',
	'list.viewTable',
	'list.viewCards',
	'list.active',
] as const;

describe('list page shell i18n', () => {
	for (const key of LIST_SHELL_KEYS) {
		test(`en has ${key}`, () => {
			expect(en[key]).toBeTruthy();
		});

		test(`fr has ${key}`, () => {
			expect(fr[key]).toBeTruthy();
		});
	}
});

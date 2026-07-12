import { describe, expect, it } from 'bun:test';
import { getImportTypeDefinition } from '$lib/import/catalog/import-types';
import { sortImportColumnsRequiredFirst } from '$lib/import/shared/sort-import-columns';
import { buildImportTemplateRows } from '$lib/import/shared/template-download';

describe('sortImportColumnsRequiredFirst', () => {
	it('places required columns before optional ones', () => {
		const sorted = sortImportColumnsRequiredFirst([
			{ key: 'email', required: false },
			{ key: 'role', required: true },
			{ key: 'prenom', required: true },
			{ key: 'telephone', required: false },
		]);

		expect(sorted.map(column => column.key)).toEqual(['role', 'prenom', 'email', 'telephone']);
	});

	it('keeps relative order within required and optional groups', () => {
		const sorted = sortImportColumnsRequiredFirst([
			{ key: 'b', required: true },
			{ key: 'a', required: true },
			{ key: 'd', required: false },
			{ key: 'c', required: false },
		]);

		expect(sorted.map(column => column.key)).toEqual(['b', 'a', 'd', 'c']);
	});
});

describe('import catalog column display order', () => {
	it('lists guardians required columns before optional ones', () => {
		const definition = getImportTypeDefinition('guardians');
		const keys = definition.columns.map(column => column.key);

		expect(keys).toEqual(['prenom', 'nom', 'eleve_matricule', 'email', 'telephone']);
	});

	it('builds guardian templates with required columns first', () => {
		const definition = getImportTypeDefinition('guardians');
		const [headers] = buildImportTemplateRows(definition);

		expect(headers).toEqual(['prenom', 'nom', 'eleve_matricule', 'email', 'telephone']);
	});
});

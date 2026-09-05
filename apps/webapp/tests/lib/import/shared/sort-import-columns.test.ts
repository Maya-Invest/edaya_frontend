import { describe, expect, it } from 'bun:test';
import { getImportTypeDefinition } from '$lib/import/catalog/import-types';
import { sortImportColumnsRequiredFirst } from '$lib/import/shared/sort-import-columns';
import { buildImportTemplateRows } from '$lib/import/shared/template-download';
import { setLang } from '$lib/i18n';

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

		expect(keys).toEqual(['code', 'prenom', 'nom', 'eleve_matricule', 'email', 'telephone']);
	});

	it('builds guardian templates with required columns first', () => {
		const definition = getImportTypeDefinition('guardians');
		const [headers] = buildImportTemplateRows(definition);

		expect(headers).toEqual(['code', 'prenom', 'nom', 'eleve_matricule', 'email', 'telephone']);
	});
});

describe('import template localization', () => {
	it('keeps French catalog examples in French', () => {
		setLang('fr');
		const subjects = getImportTypeDefinition('subjects');
		const staff = getImportTypeDefinition('staff');
		const [, subjectExample] = buildImportTemplateRows(subjects);
		const [, staffExample] = buildImportTemplateRows(staff);
		const subjectNom = subjects.columns.findIndex(column => column.key === 'nom');
		const staffRole = staff.columns.findIndex(column => column.key === 'role');

		expect(subjectExample?.[subjectNom]).toBe('Mathématiques');
		expect(staffExample?.[staffRole]).toBe('Secrétaire');
	});

	it('translates catalog examples and roles in English', () => {
		setLang('en');
		try {
			const subjects = getImportTypeDefinition('subjects');
			const staff = getImportTypeDefinition('staff');
			const assignments = getImportTypeDefinition('teacher_assignments');
			const [, subjectExample] = buildImportTemplateRows(subjects);
			const [, staffExample] = buildImportTemplateRows(staff);
			const [, assignmentExample] = buildImportTemplateRows(assignments);
			const subjectNom = subjects.columns.findIndex(column => column.key === 'nom');
			const subjectNiveau = subjects.columns.findIndex(column => column.key === 'niveau');
			const staffRole = staff.columns.findIndex(column => column.key === 'role');
			const assignmentClasse = assignments.columns.findIndex(column => column.key === 'classe');
			const assignmentMatiere = assignments.columns.findIndex(column => column.key === 'matiere');

			expect(subjectExample?.[subjectNom]).toBe('Mathematics');
			expect(subjectExample?.[subjectNiveau]).toBe('6th');
			expect(staffExample?.[staffRole]).toBe('Secretary');
			expect(assignmentExample?.[assignmentClasse]).toBe('6th A');
			expect(assignmentExample?.[assignmentMatiere]).toBe('Mathematics');
		}
		finally {
			setLang('fr');
		}
	});
});

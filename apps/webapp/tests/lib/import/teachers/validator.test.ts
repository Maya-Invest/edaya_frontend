import { describe, expect, it } from 'bun:test';
import { parseTeacherSubjectNames } from '$lib/import/teachers/parse-subject-names';
import {
	isKnownSubjectName,
	resolvePrimarySubjectId,
	resolveSubjectCatalogId,
	subjectNameSuggestions,
} from '$lib/import/teachers/subject-name-lookup';
import type { TeacherImportRow } from '$lib/import/teachers/types';
import {
	canImportValidatedTeachers,
	validateTeacherImportRows,
} from '$lib/import/teachers/validator';

function row(overrides: Partial<TeacherImportRow> & Pick<TeacherImportRow, 'rowIndex'>): TeacherImportRow {
	return {
		prenom: 'Kofi',
		nom: 'Mensah',
		...overrides,
	};
}

const CATALOG = [
	{ id: 'subj-anglais', name: 'Anglais' },
	{ id: 'subj-maths', name: 'Mathématiques' },
	{ id: 'subj-physique', name: 'Physique' },
];

const CLASSES = [
	{ id: 'class-6a', name: '6ème A' },
];

const CLASS_SUBJECTS = [
	{ id: 'cs-maths-6a', classGroupId: 'class-6a', subjectId: 'subj-maths' },
	{ id: 'cs-anglais-6a', classGroupId: 'class-6a', subjectId: 'subj-anglais' },
];

describe('parseTeacherSubjectNames', () => {
	it('splits semicolon-separated subject names', () => {
		expect(parseTeacherSubjectNames('Mathématiques; Physique')).toEqual(['Mathématiques', 'Physique']);
	});
});

describe('subjectNameLookup', () => {
	it('matches catalog names case-insensitively', () => {
		expect(isKnownSubjectName('anglais', CATALOG.map(entry => entry.name))).toBe(true);
		expect(isKnownSubjectName('Espagnol', CATALOG.map(entry => entry.name))).toBe(false);
	});

	it('resolves catalog ids from subject names', () => {
		expect(resolveSubjectCatalogId('Mathématiques', CATALOG)).toBe('subj-maths');
		expect(resolvePrimarySubjectId(['Espagnol', 'Anglais'], CATALOG)).toBe('subj-anglais');
	});

	it('suggests close catalog names', () => {
		expect(subjectNameSuggestions('angl', CATALOG.map(entry => entry.name))).toContain('Anglais');
	});
});

describe('teacher import validator', () => {
	it('accepts valid rows and parses subject names', () => {
		const result = validateTeacherImportRows([
			row({ rowIndex: 2, matieres: 'Mathématiques; Anglais', classe: '6ème A' }),
		], { subjectCatalog: CATALOG, classes: CLASSES, classSubjects: CLASS_SUBJECTS });

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
		expect(result.validRows[0]?.subjectNames).toEqual(['Mathématiques', 'Anglais']);
		expect(result.validRows[0]?.primarySubjectId).toBe('subj-maths');
		expect(canImportValidatedTeachers(result)).toBe(true);
	});

	it('does not warn when a known subject such as Anglais is provided', () => {
		const result = validateTeacherImportRows([
			row({ rowIndex: 2, matieres: 'Anglais' }),
		], { subjectCatalog: CATALOG });

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
		expect(result.validRows[0]?.primarySubjectId).toBe('subj-anglais');
	});

	it('warns when a subject is not in the catalog', () => {
		const result = validateTeacherImportRows([
			row({ rowIndex: 2, matieres: 'Espagnol' }),
		], { subjectCatalog: CATALOG });

		expect(result.errors).toEqual([]);
		expect(result.warnings[0]?.messageKey).toBe('import.teachers.validation.unknownSubject');
		expect(result.warnings[0]?.suggestions).toContain('Anglais');
	});

	it('flags missing required fields', () => {
		const result = validateTeacherImportRows([
			row({ rowIndex: 2, nom: '' }),
		]);

		expect(result.validRows).toHaveLength(0);
		expect(result.errors[0]?.messageKey).toBe('import.teachers.validation.required');
	});

	it('resolves class assignments for known subjects in a class', () => {
		const result = validateTeacherImportRows([
			row({ rowIndex: 2, matieres: 'Mathématiques; Physique', classe: '6ème A' }),
		], {
			subjectCatalog: CATALOG,
			classes: CLASSES,
			classSubjects: CLASS_SUBJECTS,
		});

		expect(result.errors).toEqual([]);
		expect(result.validRows[0]?.classGroupId).toBe('class-6a');
		expect(result.validRows[0]?.assignmentClassSubjectIds).toEqual(['cs-maths-6a']);
		expect(result.warnings.some(warning => warning.messageKey === 'import.teachers.validation.subjectNotInClass')).toBe(true);
	});

	it('flags unknown classes', () => {
		const result = validateTeacherImportRows([
			row({ rowIndex: 2, matieres: 'Mathématiques', classe: '6ème Z' }),
		], {
			subjectCatalog: CATALOG,
			classes: CLASSES,
			classSubjects: CLASS_SUBJECTS,
		});

		expect(result.validRows).toHaveLength(0);
		expect(result.errors[0]?.messageKey).toBe('import.teachers.validation.classNotFound');
	});

	it('warns when multiple subjects are provided without a class', () => {
		const result = validateTeacherImportRows([
			row({ rowIndex: 2, matieres: 'Mathématiques; Physique-Chimie' }),
		], { subjectCatalog: CATALOG });

		expect(result.errors).toEqual([]);
		expect(result.validRows).toHaveLength(1);
		expect(result.warnings.some(
			warning => warning.messageKey === 'import.teachers.validation.multiSubjectsNeedClass',
		)).toBe(true);
	});
});

import type { TeacherAssignmentImportRow } from '$lib/import/teacher-assignments/types';
import {
	parseTeacherAssignmentImportCsvText,
} from '$lib/import/teacher-assignments/parser';
import {
	canImportValidatedTeacherAssignments,
	validateTeacherAssignmentImportRows,
} from '$lib/import/teacher-assignments/validator';
import { describe, expect, it } from 'bun:test';

const TEACHERS = [
	{ id: 'tch-1', code: 'ENS-001', name: 'Kouadio Yao' },
	{ id: 'tch-2', code: 'ENS-002', name: 'Mme Zongo' },
];

const CLASSES = [
	{ id: 'class-6a', name: '6ème A' },
	{ id: 'class-5a', name: '5ème A' },
];

const CATALOG = [
	{ id: 'subj-maths', name: 'Mathématiques' },
	{ id: 'subj-anglais', name: 'Anglais' },
	{ id: 'subj-pc', name: 'Physique-Chimie' },
];

const CLASS_SUBJECTS = [
	{ id: 'cs-maths-6a', classGroupId: 'class-6a', subjectId: 'subj-maths' },
	{ id: 'cs-anglais-6a', classGroupId: 'class-6a', subjectId: 'subj-anglais' },
	{ id: 'cs-maths-5a', classGroupId: 'class-5a', subjectId: 'subj-maths' },
	{ id: 'cs-pc-5a', classGroupId: 'class-5a', subjectId: 'subj-pc' },
];

function row(
	overrides: Partial<TeacherAssignmentImportRow> & Pick<TeacherAssignmentImportRow, 'rowIndex'>,
): TeacherAssignmentImportRow {
	return {
		code: 'ENS-001',
		classe: '6ème A',
		matiere: 'Mathématiques',
		...overrides,
	};
}

describe('teacher assignment import parser', () => {
	it('parses csv rows with code, class and subject', () => {
		const result = parseTeacherAssignmentImportCsvText(`code,classe,matiere
ENS-001,6ème A,Mathématiques
ENS-002,5ème A,Anglais
`);

		expect(result.errors).toEqual([]);
		expect(result.rows).toEqual([
			{
				rowIndex: 2,
				code: 'ENS-001',
				classe: '6ème A',
				matiere: 'Mathématiques',
			},
			{
				rowIndex: 3,
				code: 'ENS-002',
				classe: '5ème A',
				matiere: 'Anglais',
			},
		]);
	});
});

describe('teacher assignment import validator', () => {
	it('resolves teacher by code, class and class subject', () => {
		const result = validateTeacherAssignmentImportRows([
			row({ rowIndex: 2 }),
			row({
				rowIndex: 3,
				code: 'ENS-002',
				classe: '5ème A',
				matiere: 'Physique-Chimie',
			}),
		], {
			teachers: TEACHERS,
			classes: CLASSES,
			subjectCatalog: CATALOG,
			classSubjects: CLASS_SUBJECTS,
		});

		expect(result.errors).toEqual([]);
		expect(result.validRows).toHaveLength(2);
		expect(result.validRows[0]).toMatchObject({
			teacherId: 'tch-1',
			classGroupId: 'class-6a',
			classSubjectId: 'cs-maths-6a',
		});
		expect(result.validRows[1]?.classSubjectId).toBe('cs-pc-5a');
		expect(canImportValidatedTeacherAssignments(result)).toBe(true);
	});

	it('resolves teacher code case-insensitively', () => {
		const result = validateTeacherAssignmentImportRows([
			row({ rowIndex: 2, code: 'ens-001' }),
		], {
			teachers: TEACHERS,
			classes: CLASSES,
			subjectCatalog: CATALOG,
			classSubjects: CLASS_SUBJECTS,
		});

		expect(result.errors).toEqual([]);
		expect(result.validRows[0]?.teacherId).toBe('tch-1');
	});

	it('flags unknown teacher code', () => {
		const result = validateTeacherAssignmentImportRows([
			row({ rowIndex: 2, code: 'ENS-999' }),
		], {
			teachers: TEACHERS,
			classes: CLASSES,
			subjectCatalog: CATALOG,
			classSubjects: CLASS_SUBJECTS,
		});

		expect(result.validRows).toHaveLength(0);
		expect(result.errors[0]?.messageKey).toBe('import.teacherAssignments.validation.teacherNotFound');
		expect(result.errors[0]?.suggestions).toContain('ENS-001');
	});

	it('flags subject not offered in class', () => {
		const result = validateTeacherAssignmentImportRows([
			row({ rowIndex: 2, matiere: 'Physique-Chimie' }),
		], {
			teachers: TEACHERS,
			classes: CLASSES,
			subjectCatalog: CATALOG,
			classSubjects: CLASS_SUBJECTS,
		});

		expect(result.validRows).toHaveLength(0);
		expect(result.errors[0]?.messageKey).toBe('import.teacherAssignments.validation.subjectNotInClass');
	});

	it('flags duplicate assignment in file', () => {
		const result = validateTeacherAssignmentImportRows([
			row({ rowIndex: 2 }),
			row({ rowIndex: 3 }),
		], {
			teachers: TEACHERS,
			classes: CLASSES,
			subjectCatalog: CATALOG,
			classSubjects: CLASS_SUBJECTS,
		});

		expect(result.validRows).toHaveLength(1);
		expect(result.errors[0]?.messageKey).toBe('import.teacherAssignments.validation.duplicateInFile');
	});
});

it('resolves the subject inside the selected class and requires an ID for duplicate names', () => {
	const context = { teachers: TEACHERS, classes: CLASSES, subjectCatalog: [{ id: 'math-5', name: 'Mathématiques' }, { id: 'math-6', name: 'Mathématiques' }], classSubjects: [{ id: 'cs-5', classGroupId: 'class-5a', subjectId: 'math-5' }, { id: 'cs-6', classGroupId: 'class-6a', subjectId: 'math-6' }] };
	expect(validateTeacherAssignmentImportRows([row({ rowIndex: 2 })], context).validRows[0]?.classSubjectId).toBe('cs-6');
	context.subjectCatalog.push({ id: 'math-6-extra', name: 'Mathématiques' });
	context.classSubjects.push({ id: 'cs-6-extra', classGroupId: 'class-6a', subjectId: 'math-6-extra' });
	expect(validateTeacherAssignmentImportRows([row({ rowIndex: 2 })], context).errors[0]?.messageKey).toBe('import.teacherAssignments.validation.ambiguousSubject');
	const parsed = parseTeacherAssignmentImportCsvText('code,classe,matiere,subjectId\nENS-001,6ème A,Mathématiques,math-6-extra');
	expect(validateTeacherAssignmentImportRows(parsed.rows, context).validRows[0]?.classSubjectId).toBe('cs-6-extra');
});

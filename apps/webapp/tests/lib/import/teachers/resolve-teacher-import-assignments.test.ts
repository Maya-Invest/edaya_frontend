import { describe, expect, it } from 'bun:test';
import { resolveTeacherImportClassSubjectIds } from '$lib/import/teachers/resolve-teacher-import-assignments';

const CATALOG = [
	{ id: 'subj-maths', name: 'Mathématiques' },
	{ id: 'subj-physique', name: 'Physique' },
];

const CLASS_SUBJECTS = [
	{ id: 'cs-maths-6a', classGroupId: 'class-6a', subjectId: 'subj-maths' },
];

describe('resolveTeacherImportClassSubjectIds', () => {
	it('maps known catalog subjects to class subject ids', () => {
		const result = resolveTeacherImportClassSubjectIds(
			'class-6a',
			['Mathématiques', 'Physique'],
			CATALOG,
			CLASS_SUBJECTS,
		);

		expect(result.classSubjectIds).toEqual(['cs-maths-6a']);
		expect(result.missingInClass).toEqual(['Physique']);
	});
});

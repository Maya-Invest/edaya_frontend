import type { ValidatedSubjectImportRow } from '$lib/import/subjects/types';

import { describe, expect, it, mock } from 'bun:test';

mock.module('$lib/subjects/notify-subjects-list-changed', () => ({

	notifySubjectsListChanged: mock(() => {}),

}));

const { runSubjectImport } = await import('$lib/import/subjects/runner');

function row(overrides: Partial<ValidatedSubjectImportRow> & Pick<ValidatedSubjectImportRow, 'rowIndex'>): ValidatedSubjectImportRow {
	return {

		nom: 'Mathématiques',

		niveau: '6ème',

		gradeLevelId: 'gl-6',

		classGroupIds: ['class-6a', 'class-6b'],

		...overrides,

	};
}

describe('subject import runner', () => {
	it('creates each valid row with one atomic configureSubject command', async () => {
		const configureSubject = mock(async () => ({}));

		const result = await runSubjectImport({
			schoolId: 'school-1',
			academicYearId: 'ay-1',
			seed: 'testseed',
			client: {
				entities: { subjectCategories: { list: async () => [{ id: 'science', schoolId: 'school-1', name: 'Scientifique' }] } },
				commands: {
					configureSubject,
				},
			} as never,
			rows: [
				row({ rowIndex: 2, abbreviation: 'MATH', coefficientValue: 3 }),
			],
		});

		expect(result.created).toBe(1);
		expect(configureSubject).toHaveBeenCalledWith(expect.objectContaining({
			name: 'Mathématiques',
			code: 'MATH',
			coefficient: 3,
		}));
		expect(configureSubject).toHaveBeenCalledWith(expect.objectContaining({
			gradeLevelId: 'gl-6',
			academicYearId: 'ay-1',
			coefficient: 3,
			classSubjectIdsByClassGroupId: expect.objectContaining({
				'class-6a': expect.any(String),
				'class-6b': expect.any(String),
			}),
		}));
	});
});

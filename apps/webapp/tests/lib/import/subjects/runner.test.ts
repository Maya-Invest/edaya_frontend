import { describe, expect, it, mock } from 'bun:test';

import type { ValidatedSubjectImportRow } from '$lib/import/subjects/types';



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

	it('creates each valid row via configureSubject and offerSubjectToGradeLevel', async () => {
		const configureSubject = mock(async () => ({}));
		const offerSubjectToGradeLevel = mock(async () => ({}));

		const result = await runSubjectImport({
			schoolId: 'school-1',
			academicYearId: 'ay-1',
			seed: 'testseed',
			client: {
				commands: {
					configureSubject,
					offerSubjectToGradeLevel,
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
			defaultCoefficient: 3,
		}));
		expect(offerSubjectToGradeLevel).toHaveBeenCalledWith(expect.objectContaining({
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


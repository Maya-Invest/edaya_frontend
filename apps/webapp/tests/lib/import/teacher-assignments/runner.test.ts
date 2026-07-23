import { describe, expect, it, mock } from 'bun:test';
import type { ValidatedTeacherAssignmentImportRow } from '$lib/import/teacher-assignments/types';

mock.module('$lib/teachers/notify-teachers-list-changed', () => ({
	notifyTeachersListChanged: mock(() => {}),
}));

const { runTeacherAssignmentImport } = await import('$lib/import/teacher-assignments/runner');

function row(
	overrides: Partial<ValidatedTeacherAssignmentImportRow> & Pick<ValidatedTeacherAssignmentImportRow, 'rowIndex'>,
): ValidatedTeacherAssignmentImportRow {
	return {
		code: 'ENS-001',
		classe: '6ème A',
		matiere: 'Mathématiques',
		teacherId: 'tch-1',
		teacherName: 'Kouadio Yao',
		classGroupId: 'class-6a',
		classSubjectId: 'cs-maths-6a',
		...overrides,
	};
}

describe('teacher assignment import runner', () => {
	it('saves one assignment per valid row', async () => {
		const save = mock(async () => ({}));

		const result = await runTeacherAssignmentImport({
			academicYearId: 'year-1',
			seed: 'testseed',
			client: {
				entities: {
					teacherAssignments: { save },
				},
			} as never,
			rows: [
				row({ rowIndex: 2 }),
				row({
					rowIndex: 3,
					code: 'ENS-002',
					classe: '5ème A',
					matiere: 'Anglais',
					teacherId: 'tch-2',
					teacherName: 'Mme Zongo',
					classGroupId: 'class-5a',
					classSubjectId: 'cs-anglais-5a',
				}),
			],
		});

		expect(result.created).toBe(2);
		expect(save).toHaveBeenCalledTimes(2);
		expect(save).toHaveBeenNthCalledWith(1, {
			id: 'ta-testseed-2-0',
			teacherId: 'tch-1',
			academicYearId: 'year-1',
			kind: 'subject',
			classSubjectId: 'cs-maths-6a',
			classGroupId: 'class-6a',
			responsibility: null,
			status: 'active',
		});
	});
});

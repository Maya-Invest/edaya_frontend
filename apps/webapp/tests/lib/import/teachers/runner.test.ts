import { describe, expect, it, mock } from 'bun:test';
import type { ValidatedTeacherImportRow } from '$lib/import/teachers/types';

const saveTeacher = mock(async () => undefined);

mock.module('$lib/teachers/save-teacher', () => ({
	saveTeacher,
}));

mock.module('$lib/teachers/notify-teachers-list-changed', () => ({
	notifyTeachersListChanged: mock(async () => undefined),
}));

const { runTeacherImport } = await import('$lib/import/teachers/runner');

function row(overrides: Partial<ValidatedTeacherImportRow> & Pick<ValidatedTeacherImportRow, 'rowIndex'>): ValidatedTeacherImportRow {
	return {
		code: 'ENS-001',
		prenom: 'Jean',
		nom: 'Dupont',
		email: 'jean@example.com',
		...overrides,
	};
}

describe('teacher import runner', () => {
	it('creates each valid row with subjectId null', async () => {
		saveTeacher.mockReset();

		const result = await runTeacherImport({
			schoolId: 'school-1',
			academicYearId: 'year-1',
			client: {} as never,
			rows: [
				row({ rowIndex: 2 }),
				row({ rowIndex: 3, code: 'ENS-002', prenom: 'Marie', nom: 'Martin' }),
			],
		});

		expect(result.created).toBe(2);
		expect(result.failed).toEqual([]);
		expect(saveTeacher).toHaveBeenCalledTimes(2);
		expect(saveTeacher).toHaveBeenNthCalledWith(1, expect.anything(), {
			schoolId: 'school-1',
			teacherId: 'ENS-001',
			firstName: 'Jean',
			lastName: 'Dupont',
			email: 'jean@example.com',
			phone: undefined,
			subjectId: null,
		});
	});
});

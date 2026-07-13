import { describe, expect, it, mock } from 'bun:test';
import type { ValidatedTeacherImportRow } from '$lib/import/teachers/types';

mock.module('$lib/teachers/notify-teachers-list-changed', () => ({
	notifyTeachersListChanged: mock(() => {}),
}));

const { runTeacherImport } = await import('$lib/import/teachers/runner');

function row(overrides: Partial<ValidatedTeacherImportRow> & Pick<ValidatedTeacherImportRow, 'rowIndex'>): ValidatedTeacherImportRow {
	return {
		prenom: 'Kofi',
		nom: 'Mensah',
		subjectNames: [],
		...overrides,
	};
}

describe('teacher import runner', () => {
	it('saves each valid row sequentially', async () => {
		const save = mock(async () => ({}));

		const result = await runTeacherImport({
			schoolId: 'school-1',
			seed: 'testseed',
			client: {
				entities: {
					teachers: { save },
				},
			} as never,
			rows: [
				row({ rowIndex: 2, email: 'kofi@example.com', telephone: '+225 01 00 00 00 00' }),
			],
		});

		expect(result.created).toBe(1);
		expect(save).toHaveBeenCalledWith({
			id: 'tch-testseed-0',
			schoolId: 'school-1',
			firstName: 'Kofi',
			lastName: 'Mensah',
			email: 'kofi@example.com',
			phone: '+225 01 00 00 00 00',
			subjectId: null,
			isActive: true,
		});
	});

	it('persists the primary catalog subject from matieres', async () => {
		const save = mock(async () => ({}));

		await runTeacherImport({
			schoolId: 'school-1',
			seed: 'testseed',
			client: {
				entities: {
					teachers: { save },
				},
			} as never,
			rows: [
				row({
					rowIndex: 2,
					matieres: 'Mathématiques',
					subjectNames: ['Mathématiques'],
					primarySubjectId: 'subj-maths',
				}),
			],
		});

		expect(save).toHaveBeenCalledWith(expect.objectContaining({
			subjectId: 'subj-maths',
		}));
	});
});

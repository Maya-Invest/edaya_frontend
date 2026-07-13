import { describe, expect, it, mock } from 'bun:test';
import type { ValidatedStudentImportRow } from '$lib/import/students/types';

mock.module('$lib/students/notify-students-list-changed', () => ({
	notifyStudentsListChanged: mock(() => {}),
}));

const { runStudentImport } = await import('$lib/import/students/runner');

function row(overrides: Partial<ValidatedStudentImportRow> & Pick<ValidatedStudentImportRow, 'rowIndex'>): ValidatedStudentImportRow {
	return {
		prenom: 'Jean',
		nom: 'Dupont',
		classe: '6ème A',
		classGroupId: 'class-6a',
		...overrides,
	};
}

describe('student import runner', () => {
	it('registers and enrolls each valid row sequentially', async () => {
		const registerStudent = mock(async () => {});
		const enrollStudent = mock(async () => {});
		const updateStudentProfile = mock(async () => {});
		const progress: Array<{ current: number; total: number }> = [];

		const result = await runStudentImport({
			schoolId: 'school-1',
			seed: 'testseed',
			client: {
				commands: {
					registerStudent,
					enrollStudent,
					updateStudentProfile,
				},
			} as never,
			rows: [
				row({ rowIndex: 2 }),
				row({ rowIndex: 3, prenom: 'Marie', nom: 'Kouassi', classGroupId: 'class-6b' }),
			],
			onProgress: (current, total) => {
				progress.push({ current, total });
			},
		});

		expect(result.created).toBe(2);
		expect(result.failed).toEqual([]);
		expect(result.studentIds).toEqual(['stu-testseed-0', 'stu-testseed-1']);
		expect(registerStudent).toHaveBeenCalledTimes(2);
		expect(enrollStudent).toHaveBeenCalledTimes(2);
		expect(updateStudentProfile).not.toHaveBeenCalled();
		expect(enrollStudent).toHaveBeenNthCalledWith(2, expect.objectContaining({
			studentId: 'stu-testseed-1',
			classGroupId: 'class-6b',
		}));
		expect(progress.at(-1)).toEqual({ current: 2, total: 2 });
	});

	it('formats class capacity failures with the row class label', async () => {
		const registerStudent = mock(async () => {});
		const enrollStudent = mock(async () => {
			throw new Error('Class group ci-6a has reached capacity');
		});
		const updateStudentProfile = mock(async () => {});

		const result = await runStudentImport({
			schoolId: 'school-1',
			seed: 'capacity',
			client: {
				commands: {
					registerStudent,
					enrollStudent,
					updateStudentProfile,
				},
			} as never,
			rows: [row({ rowIndex: 8, prenom: 'Fatim', nom: 'Cissé', classe: '6ème A', classGroupId: 'ci-6a' })],
			classNameById: new Map([['ci-6a', '6ème A']]),
		});

		expect(result.created).toBe(0);
		expect(result.failed[0]?.message).toContain('6ème A');
		expect(result.failed[0]?.message).not.toContain('ci-6a');
	});

	it('continues after a row failure and reports partial success', async () => {
		const registerStudent = mock(async (_payload: { firstName: string }) => {
			if (_payload.firstName === 'Marie') {
				throw new Error('Enrollment conflict');
			}
		});
		const enrollStudent = mock(async () => {});
		const updateStudentProfile = mock(async () => {});

		const result = await runStudentImport({
			schoolId: 'school-1',
			seed: 'partial',
			client: {
				commands: {
					registerStudent,
					enrollStudent,
					updateStudentProfile,
				},
			} as never,
			rows: [
				row({ rowIndex: 2 }),
				row({ rowIndex: 3, prenom: 'Marie', nom: 'Kouassi' }),
			],
		});

		expect(result.created).toBe(1);
		expect(result.failed).toHaveLength(1);
		expect(result.failed[0]?.rowIndex).toBe(3);
		expect(result.failed[0]?.message).toContain('Enrollment conflict');
	});

	it('persists matricule via updateStudentProfile when provided', async () => {
		const registerStudent = mock(async () => {});
		const enrollStudent = mock(async () => {});
		const updateStudentProfile = mock(async () => {});

		const result = await runStudentImport({
			schoolId: 'school-1',
			seed: 'matricule',
			client: {
				commands: {
					registerStudent,
					enrollStudent,
					updateStudentProfile,
				},
			} as never,
			rows: [
				row({ rowIndex: 2, matricule: 'MAT-2024-001' }),
				row({ rowIndex: 3, prenom: 'Marie', nom: 'Kouassi' }),
			],
		});

		expect(result.created).toBe(2);
		expect(updateStudentProfile).toHaveBeenCalledTimes(1);
		expect(updateStudentProfile).toHaveBeenCalledWith({
			studentId: 'stu-matricule-0',
			firstName: 'Jean',
			lastName: 'Dupont',
			birthDate: null,
			matricule: 'MAT-2024-001',
		});
	});
});

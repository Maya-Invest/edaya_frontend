import { describe, expect, it, mock } from 'bun:test';
import type { ValidatedGuardianImportRow } from '$lib/import/guardians/types';

mock.module('$lib/guardians/notify-guardians-list-changed', () => ({
	notifyGuardiansListChanged: mock(() => {}),
}));

const { runGuardianImport } = await import('$lib/import/guardians/runner');

function row(overrides: Partial<ValidatedGuardianImportRow> & Pick<ValidatedGuardianImportRow, 'rowIndex'>): ValidatedGuardianImportRow {
	return {
		code: 'TUT-001',
		prenom: 'Aminata',
		nom: 'Koné',
		eleve_matricule: 'MAT-2024-001',
		studentIds: ['stu-1'],
		...overrides,
	};
}

describe('guardian import runner', () => {
	it('registers and links each valid row sequentially without invitations', async () => {
		const registerGuardian = mock(async () => {});
		const linkGuardianToStudent = mock(async () => {});

		const result = await runGuardianImport({
			schoolId: 'school-1',
			client: {
				commands: {
					registerGuardian,
					linkGuardianToStudent,
				},
			} as never,
			rows: [
				row({ rowIndex: 2 }),
				row({
					rowIndex: 3,
					code: 'TUT-002',
					prenom: 'Moussa',
					nom: 'Traoré',
					studentIds: ['stu-2'],
					eleve_matricule: 'MAT-2024-002',
				}),
			],
		});

		expect(result.created).toBe(2);
		expect(result.failed).toEqual([]);
		expect(result.guardianIds).toEqual(['TUT-001', 'TUT-002']);
		expect(registerGuardian).toHaveBeenCalledTimes(2);
		expect(linkGuardianToStudent).toHaveBeenCalledTimes(2);
		expect(registerGuardian).toHaveBeenNthCalledWith(1, expect.objectContaining({
			id: 'TUT-001',
			sendAccountInvitation: false,
		}));
		expect(linkGuardianToStudent).toHaveBeenNthCalledWith(2, expect.objectContaining({
			studentId: 'stu-2',
			guardianId: 'TUT-002',
		}));
	});
});

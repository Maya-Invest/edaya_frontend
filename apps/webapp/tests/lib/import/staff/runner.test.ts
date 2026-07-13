import { describe, expect, it, mock } from 'bun:test';
import type { ValidatedStaffImportRow } from '$lib/import/staff/types';

mock.module('$lib/staff/notify-staff-list-changed', () => ({
	notifyStaffListChanged: mock(() => {}),
}));

const { runStaffImport } = await import('$lib/import/staff/runner');

function row(overrides: Partial<ValidatedStaffImportRow> & Pick<ValidatedStaffImportRow, 'rowIndex'>): ValidatedStaffImportRow {
	return {
		prenom: 'Fatou',
		nom: 'Diallo',
		role: 'Secrétaire',
		...overrides,
	};
}

describe('staff import runner', () => {
	it('registers each valid row sequentially without invitations', async () => {
		const registerStaffMember = mock(async () => {});
		const progress: Array<{ current: number; total: number }> = [];

		const result = await runStaffImport({
			schoolId: 'school-1',
			seed: 'testseed',
			client: {
				commands: {
					registerStaffMember,
				},
			} as never,
			rows: [
				row({ rowIndex: 2, email: 'fatou@example.com' }),
				row({ rowIndex: 3, prenom: 'Kofi', nom: 'Mensah', role: 'Directeur adjoint' }),
			],
			onProgress: (current, total) => {
				progress.push({ current, total });
			},
		});

		expect(result.created).toBe(2);
		expect(result.failed).toEqual([]);
		expect(result.staffIds).toEqual(['stf-testseed-0', 'stf-testseed-1']);
		expect(registerStaffMember).toHaveBeenCalledTimes(2);
		expect(registerStaffMember).toHaveBeenNthCalledWith(1, expect.objectContaining({
			id: 'stf-testseed-0',
			firstName: 'Fatou',
			lastName: 'Diallo',
			email: 'fatou@example.com',
			sendAccountInvitation: false,
		}));
		expect(progress.at(-1)).toEqual({ current: 2, total: 2 });
	});
});

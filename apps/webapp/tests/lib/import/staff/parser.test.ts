import { describe, expect, it } from 'bun:test';
import {
	buildStaffImportXlsxBufferFromRows,
	parseStaffImportCsvText,
	parseStaffImportXlsxBuffer,
} from '$lib/import/staff/parser';

const SAMPLE_CSV = `prenom,nom,role,email,telephone
Fatou,Diallo,Secrétaire,fatou.diallo@example.com,+225 05 00 00 00 00
Kofi,Mensah,Directeur adjoint,kofi.mensah@example.com,
`;

describe('staff import parser', () => {
	it('parses csv rows with normalized headers and row indexes', () => {
		const result = parseStaffImportCsvText(SAMPLE_CSV);

		expect(result.errors).toEqual([]);
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0]).toEqual({
			rowIndex: 2,
			prenom: 'Fatou',
			nom: 'Diallo',
			role: 'Secrétaire',
			email: 'fatou.diallo@example.com',
			telephone: '+225 05 00 00 00 00',
		});
	});

	it('parses xlsx buffer with the same row shape as csv', () => {
		const csvResult = parseStaffImportCsvText(SAMPLE_CSV);
		const xlsxBuffer = buildStaffImportXlsxBufferFromRows([
			['prenom', 'nom', 'role', 'email', 'telephone'],
			['Fatou', 'Diallo', 'Secrétaire', 'fatou.diallo@example.com', '+225 05 00 00 00 00'],
			['Kofi', 'Mensah', 'Directeur adjoint', 'kofi.mensah@example.com', ''],
		]);
		const xlsxResult = parseStaffImportXlsxBuffer(xlsxBuffer);

		expect(xlsxResult.errors).toEqual([]);
		expect(xlsxResult.rows[0]).toEqual(csvResult.rows[0]);
	});
});

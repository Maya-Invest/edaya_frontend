import { describe, expect, it } from 'bun:test';
import {
	buildGuardianImportXlsxBufferFromRows,
	parseGuardianImportCsvText,
	parseGuardianImportXlsxBuffer,
} from '$lib/import/guardians/parser';

const SAMPLE_CSV = `prenom,nom,email,telephone,eleve_matricule
Aminata,Koné,aminata.kone@example.com,+225 07 00 00 00 00,MAT-2024-001
Moussa,Traoré,,,MAT-2024-002
`;

describe('guardian import parser', () => {
	it('parses csv rows with normalized headers and row indexes', () => {
		const result = parseGuardianImportCsvText(SAMPLE_CSV);

		expect(result.errors).toEqual([]);
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0]).toEqual({
			rowIndex: 2,
			prenom: 'Aminata',
			nom: 'Koné',
			email: 'aminata.kone@example.com',
			telephone: '+225 07 00 00 00 00',
			eleve_matricule: 'MAT-2024-001',
		});
	});

	it('parses xlsx buffer with the same row shape as csv', () => {
		const csvResult = parseGuardianImportCsvText(SAMPLE_CSV);
		const xlsxBuffer = buildGuardianImportXlsxBufferFromRows([
			['prenom', 'nom', 'email', 'telephone', 'eleve_matricule'],
			['Aminata', 'Koné', 'aminata.kone@example.com', '+225 07 00 00 00 00', 'MAT-2024-001'],
			['Moussa', 'Traoré', '', '', 'MAT-2024-002'],
		]);
		const xlsxResult = parseGuardianImportXlsxBuffer(xlsxBuffer);

		expect(xlsxResult.errors).toEqual([]);
		expect(xlsxResult.rows[0]).toEqual(csvResult.rows[0]);
	});
});

import { describe, expect, it } from 'bun:test';
import {
	buildTeacherImportXlsxBufferFromRows,
	parseTeacherImportCsvText,
	parseTeacherImportXlsxBuffer,
} from '$lib/import/teachers/parser';

const SAMPLE_CSV = `prenom,nom,email,matieres,telephone
Kofi,Mensah,kofi.mensah@example.com,"Mathématiques, Physique",+225 01 00 00 00 00
Awa,Kouassi,awa.kouassi@example.com,,
`;

describe('teacher import parser', () => {
	it('parses csv rows with normalized headers and row indexes', () => {
		const result = parseTeacherImportCsvText(SAMPLE_CSV);

		expect(result.errors).toEqual([]);
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0]).toEqual({
			rowIndex: 2,
			prenom: 'Kofi',
			nom: 'Mensah',
			email: 'kofi.mensah@example.com',
			matieres: 'Mathématiques, Physique',
			telephone: '+225 01 00 00 00 00',
		});
	});

	it('parses xlsx buffer with the same row shape as csv', () => {
		const csvResult = parseTeacherImportCsvText(SAMPLE_CSV);
		const xlsxBuffer = buildTeacherImportXlsxBufferFromRows([
			['prenom', 'nom', 'email', 'matieres', 'telephone'],
			['Kofi', 'Mensah', 'kofi.mensah@example.com', 'Mathématiques, Physique', '+225 01 00 00 00 00'],
			['Awa', 'Kouassi', 'awa.kouassi@example.com', '', ''],
		]);
		const xlsxResult = parseTeacherImportXlsxBuffer(xlsxBuffer);

		expect(xlsxResult.errors).toEqual([]);
		expect(xlsxResult.rows[0]).toEqual(csvResult.rows[0]);
	});
});

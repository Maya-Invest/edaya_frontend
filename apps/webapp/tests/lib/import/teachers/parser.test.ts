import { describe, expect, it } from 'bun:test';
import {
	buildTeacherImportXlsxBufferFromRows,
	parseTeacherImportCsvText,
	parseTeacherImportXlsxBuffer,
} from '$lib/import/teachers/parser';

const SAMPLE_CSV = `prenom,nom,email,telephone
Jean,Dupont,jean@example.com,+225 07 00 00 00 01
Marie,Martin,,+225 05 11 22 33 44
`;

describe('teacher import parser', () => {
	it('parses csv rows with normalized headers and row indexes', () => {
		const result = parseTeacherImportCsvText(SAMPLE_CSV);

		expect(result.errors).toEqual([]);
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0]).toEqual({
			rowIndex: 2,
			prenom: 'Jean',
			nom: 'Dupont',
			email: 'jean@example.com',
			telephone: '+225 07 00 00 00 01',
		});
		expect(result.rows[1]).toEqual({
			rowIndex: 3,
			prenom: 'Marie',
			nom: 'Martin',
			telephone: '+225 05 11 22 33 44',
		});
	});

	it('returns empty_file for blank csv', () => {
		const result = parseTeacherImportCsvText('   ');

		expect(result.rows).toEqual([]);
		expect(result.errors[0]?.message).toBe('empty_file');
	});

	it('parses xlsx buffer with the same row shape as csv', () => {
		const csvResult = parseTeacherImportCsvText(SAMPLE_CSV);
		const xlsxBuffer = buildTeacherImportXlsxBufferFromRows([
			['prenom', 'nom', 'email', 'telephone'],
			['Jean', 'Dupont', 'jean@example.com', '+225 07 00 00 00 01'],
			['Marie', 'Martin', '', '+225 05 11 22 33 44'],
		]);
		const xlsxResult = parseTeacherImportXlsxBuffer(xlsxBuffer);

		expect(xlsxResult.errors).toEqual([]);
		expect(xlsxResult.rows[0]).toEqual(csvResult.rows[0]);
	});
});

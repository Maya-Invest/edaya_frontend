import { describe, expect, it } from 'bun:test';
import {
	buildClassImportXlsxBufferFromRows,
	parseClassImportCsvText,
	parseClassImportXlsxBuffer,
} from '$lib/import/classes/parser';

const SAMPLE_CSV = `nom,niveau,capacite
6ème A,6ème,35
6ème B,6ème,30
`;

describe('class import parser', () => {
	it('parses csv rows with normalized headers and row indexes', () => {
		const result = parseClassImportCsvText(SAMPLE_CSV);

		expect(result.errors).toEqual([]);
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0]).toEqual({
			rowIndex: 2,
			nom: '6ème A',
			niveau: '6ème',
			capacite: '35',
		});
		expect(result.rows[1]?.rowIndex).toBe(3);
	});

	it('parses csv with BOM-prefixed headers', () => {
		const result = parseClassImportCsvText(`\uFEFFnom,niveau,capacite\n6ème A,6ème,35\n`);

		expect(result.errors).toEqual([]);
		expect(result.rows).toHaveLength(1);
		expect(result.rows[0]?.nom).toBe('6ème A');
	});

	it('parses xlsx buffer with the same row shape as csv', () => {
		const csvResult = parseClassImportCsvText(SAMPLE_CSV);
		const xlsxBuffer = buildClassImportXlsxBufferFromRows([
			['nom', 'niveau', 'capacite'],
			['6ème A', '6ème', '35'],
			['6ème B', '6ème', '30'],
		]);
		const xlsxResult = parseClassImportXlsxBuffer(xlsxBuffer);

		expect(xlsxResult.errors).toEqual([]);
		expect(xlsxResult.rows[0]).toEqual(csvResult.rows[0]);
		expect(xlsxResult.rows[1]?.nom).toBe('6ème B');
	});

	it('returns an empty_file error for blank csv', () => {
		const result = parseClassImportCsvText('   \n');

		expect(result.rows).toEqual([]);
		expect(result.errors[0]?.message).toBe('empty_file');
	});
});

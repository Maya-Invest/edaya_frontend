import { describe, expect, it } from 'bun:test';
import {
	buildSubjectImportXlsxBufferFromRows,
	parseSubjectImportCsvText,
	parseSubjectImportXlsxBuffer,
} from '$lib/import/subjects/parser';

describe('subject import parser', () => {
	it('parses csv rows with normalized headers and row indexes', () => {
		const result = parseSubjectImportCsvText([
			'nom,niveau,abbreviation,coefficient',
			'Mathématiques,6ème,MATH,3',
			'Anglais,6ème B,ANG,2',
		].join('\n'));

		expect(result.errors).toEqual([]);
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0]).toEqual({
			rowIndex: 2,
			nom: 'Mathématiques',
			niveau: '6ème',
			abbreviation: 'MATH',
			coefficient: '3',
		});
	});

	it('parses xlsx buffer with the same row shape as csv', () => {
		const buffer = buildSubjectImportXlsxBufferFromRows([
			['nom', 'niveau', 'abbreviation', 'coefficient'],
			['Physique', '5ème', 'PHY', '2'],
		]);
		const result = parseSubjectImportXlsxBuffer(buffer);

		expect(result.errors).toEqual([]);
		expect(result.rows).toHaveLength(1);
		expect(result.rows[0]?.nom).toBe('Physique');
		expect(result.rows[0]?.niveau).toBe('5ème');
	});
});

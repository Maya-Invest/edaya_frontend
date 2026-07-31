import { describe, expect, it } from 'bun:test';
import {
	buildChapterImportXlsxBufferFromRows,
	parseChapterImportCsvText,
	parseChapterImportXlsxBuffer,
} from '$lib/import/chapters/parser';

describe('chapter import parser', () => {
	it('parses csv rows with normalized headers and row indexes', () => {
		const result = parseChapterImportCsvText([
			'niveau,matiere,titre,ordre,description',
			'6ème,Mathématiques,Les fractions,1,Introduction',
		].join('\n'));

		expect(result.errors).toEqual([]);
		expect(result.rows).toHaveLength(1);
		expect(result.rows[0]).toEqual({
			rowIndex: 2,
			niveau: '6ème',
			matiere: 'Mathématiques',
			titre: 'Les fractions',
			ordre: '1',
			description: 'Introduction',
		});
	});

	it('parses xlsx buffer with the same row shape as csv', () => {
		const buffer = buildChapterImportXlsxBufferFromRows([
			['niveau', 'matiere', 'titre', 'ordre', 'description'],
			['6ème', 'Français', 'La poésie', '2', 'Vers et rimes'],
		]);
		const result = parseChapterImportXlsxBuffer(buffer);

		expect(result.errors).toEqual([]);
		expect(result.rows[0]?.titre).toBe('La poésie');
		expect(result.rows[0]?.matiere).toBe('Français');
	});
});

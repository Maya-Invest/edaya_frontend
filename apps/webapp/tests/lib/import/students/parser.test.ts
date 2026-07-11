import { describe, expect, it } from 'bun:test';
import {
	buildStudentImportXlsxBufferFromRows,
	parseStudentImportCsvText,
	parseStudentImportXlsxBuffer,
} from '$lib/import/students/parser';

const SAMPLE_CSV = `prenom,nom,classe,date_naissance,genre,matricule
Jean,Dupont,6ème A,2012-03-15,M,MAT-2024-001
Marie,Kouassi,6ème A,2011-07-22,F,MAT-2024-002
`;

describe('student import parser', () => {
	it('parses csv rows with normalized headers and row indexes', () => {
		const result = parseStudentImportCsvText(SAMPLE_CSV);

		expect(result.errors).toEqual([]);
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0]).toEqual({
			rowIndex: 2,
			prenom: 'Jean',
			nom: 'Dupont',
			classe: '6ème A',
			date_naissance: '2012-03-15',
			genre: 'M',
			matricule: 'MAT-2024-001',
		});
		expect(result.rows[1]?.rowIndex).toBe(3);
	});

	it('parses csv with BOM-prefixed headers', () => {
		const result = parseStudentImportCsvText(`\uFEFFprenom,nom,classe\nJean,Dupont,6ème A\n`);

		expect(result.errors).toEqual([]);
		expect(result.rows).toHaveLength(1);
		expect(result.rows[0]?.prenom).toBe('Jean');
	});

	it('parses xlsx buffer with the same row shape as csv', () => {
		const csvResult = parseStudentImportCsvText(SAMPLE_CSV);
		const xlsxBuffer = buildStudentImportXlsxBufferFromRows([
			['prenom', 'nom', 'classe', 'date_naissance', 'genre', 'matricule'],
			['Jean', 'Dupont', '6ème A', '2012-03-15', 'M', 'MAT-2024-001'],
			['Marie', 'Kouassi', '6ème A', '2011-07-22', 'F', 'MAT-2024-002'],
		]);
		const xlsxResult = parseStudentImportXlsxBuffer(xlsxBuffer);

		expect(xlsxResult.errors).toEqual([]);
		expect(xlsxResult.rows[0]).toEqual(csvResult.rows[0]);
		expect(xlsxResult.rows[1]?.nom).toBe('Kouassi');
	});

	it('returns an empty_file error for blank csv', () => {
		const result = parseStudentImportCsvText('   \n');

		expect(result.rows).toEqual([]);
		expect(result.errors[0]?.message).toBe('empty_file');
	});
});

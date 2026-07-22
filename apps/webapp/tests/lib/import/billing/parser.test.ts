import { describe, expect, it } from 'bun:test';
import {
	buildBillingImportXlsxBufferFromRows,
	parseBillingImportCsvText,
	parseBillingImportXlsxBuffer,
} from '$lib/import/billing/parser';

const SAMPLE_CSV = `matricule,type_frais,montant,date_echeance
CI-2025-001,Scolarité — Collège,,2025-10-01
CI-2025-002,Scolarité — Collège,150000,2025-10-05
`;

describe('billing import parser', () => {
	it('parses csv rows with normalized headers and row indexes', () => {
		const result = parseBillingImportCsvText(SAMPLE_CSV);

		expect(result.errors).toEqual([]);
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0]).toEqual({
			rowIndex: 2,
			matricule: 'CI-2025-001',
			type_frais: 'Scolarité — Collège',
			date_echeance: '2025-10-01',
		});
		expect(result.rows[1]).toEqual({
			rowIndex: 3,
			matricule: 'CI-2025-002',
			type_frais: 'Scolarité — Collège',
			montant: '150000',
			date_echeance: '2025-10-05',
		});
	});

	it('returns empty_file for blank csv', () => {
		const result = parseBillingImportCsvText('   ');

		expect(result.rows).toEqual([]);
		expect(result.errors[0]?.message).toBe('empty_file');
	});

	it('parses xlsx buffer with the same row shape as csv', () => {
		const csvResult = parseBillingImportCsvText(SAMPLE_CSV);
		const xlsxBuffer = buildBillingImportXlsxBufferFromRows([
			['matricule', 'type_frais', 'montant', 'date_echeance'],
			['CI-2025-001', 'Scolarité — Collège', '', '2025-10-01'],
			['CI-2025-002', 'Scolarité — Collège', '150000', '2025-10-05'],
		]);
		const xlsxResult = parseBillingImportXlsxBuffer(xlsxBuffer);

		expect(xlsxResult.errors).toEqual([]);
		expect(xlsxResult.rows[0]).toEqual(csvResult.rows[0]);
		expect(xlsxResult.rows[1]?.montant).toBe('150000');
	});
});

import { describe, expect, it } from 'bun:test';
import {
	buildPaymentImportXlsxBufferFromRows,
	parsePaymentImportCsvText,
	parsePaymentImportXlsxBuffer,
} from '$lib/import/payments/parser';

const SAMPLE_CSV = `matricule,type_frais,reference,montant,date,mode,notes
CI-2025-001,Scolarité — Collège,MM-CI-2025-100,75000,2025-09-01,mobile_money,1er versement
CI-2025-002,Scolarité — Collège,VIR-CI-2025-101,,2025-09-02,virement,Solde restant
`;

describe('payment import parser', () => {
	it('parses csv rows with normalized headers and row indexes', () => {
		const result = parsePaymentImportCsvText(SAMPLE_CSV);

		expect(result.errors).toEqual([]);
		expect(result.rows).toHaveLength(2);
		expect(result.rows[0]).toEqual({
			rowIndex: 2,
			matricule: 'CI-2025-001',
			type_frais: 'Scolarité — Collège',
			reference: 'MM-CI-2025-100',
			montant: '75000',
			date: '2025-09-01',
			mode: 'mobile_money',
			notes: '1er versement',
		});
		expect(result.rows[1]).toEqual({
			rowIndex: 3,
			matricule: 'CI-2025-002',
			type_frais: 'Scolarité — Collège',
			reference: 'VIR-CI-2025-101',
			date: '2025-09-02',
			mode: 'virement',
			notes: 'Solde restant',
		});
	});

	it('returns empty_file for blank csv', () => {
		const result = parsePaymentImportCsvText('   ');

		expect(result.rows).toEqual([]);
		expect(result.errors[0]?.message).toBe('empty_file');
	});

	it('parses xlsx buffer with the same row shape as csv', () => {
		const csvResult = parsePaymentImportCsvText(SAMPLE_CSV);
		const xlsxBuffer = buildPaymentImportXlsxBufferFromRows([
			['matricule', 'type_frais', 'reference', 'montant', 'date', 'mode', 'notes'],
			['CI-2025-001', 'Scolarité — Collège', 'MM-CI-2025-100', '75000', '2025-09-01', 'mobile_money', '1er versement'],
			['CI-2025-002', 'Scolarité — Collège', 'VIR-CI-2025-101', '', '2025-09-02', 'virement', 'Solde restant'],
		]);
		const xlsxResult = parsePaymentImportXlsxBuffer(xlsxBuffer);

		expect(xlsxResult.errors).toEqual([]);
		expect(xlsxResult.rows[0]).toEqual(csvResult.rows[0]);
		expect(xlsxResult.rows[1]?.reference).toBe('VIR-CI-2025-101');
	});
});

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { FEE_SCHOOL, MATRICULES } from '../_shared/ivory-coast-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Paiements');

const HEADERS = ['matricule', 'type_frais', 'reference', 'montant', 'date', 'mode', 'notes'] as const;

write('PA02-partial-import.xlsx', HEADERS, [
	[MATRICULES.kouadioYao, FEE_SCHOOL, 'MM-CI-2025-001', '75000', '2025-09-15', 'mobile_money', 'Orange Money — 1er trimestre'],
	[MATRICULES.aminataKone, FEE_SCHOOL, 'MM-CI-2025-002', '', '2025-09-16', 'mobile_money', 'Solde restant automatique'],
	['CI-2025-999', FEE_SCHOOL, 'MM-CI-2025-003', '50000', '2025-09-17', 'mobile_money', 'Matricule inconnu'],
	[MATRICULES.nguessanKouassi, 'Frais inexistants', 'MM-CI-2025-004', '50000', '2025-09-18', 'espèces', 'Type de frais invalide'],
]);

write('PA03-error-student-not-found.xlsx', HEADERS, [
	['CI-2025-999', FEE_SCHOOL, 'VIR-CI-2025-001', '150000', '2025-09-10', 'virement', 'Matricule absent'],
	['CI-2025-998', FEE_SCHOOL, 'VIR-CI-2025-002', '150000', '2025-09-11', 'virement', ''],
]);

write('PA04-error-fee-not-found.xlsx', HEADERS, [
	[MATRICULES.kouadioYao, 'Frais de cantine', 'CANT-001', '25000', '2025-09-10', 'espèces', 'Frais non configuré'],
	[MATRICULES.aminataKone, 'Inscription sport', 'SPORT-001', '10000', '2025-09-11', 'espèces', ''],
]);

write('PA05-error-missing-required.xlsx', HEADERS, [
	['', FEE_SCHOOL, 'REF-001', '50000', '2025-09-10', 'espèces', ''],
	[MATRICULES.kouadioYao, '', 'REF-002', '50000', '2025-09-10', 'espèces', ''],
	[MATRICULES.aminataKone, FEE_SCHOOL, '', '50000', '2025-09-10', 'espèces', ''],
]);

write('PA06-error-invalid-amount.xlsx', HEADERS, [
	[MATRICULES.adjouaBamba, FEE_SCHOOL, 'MM-CI-2025-010', 'abc', '2025-09-10', 'mobile_money', 'Montant invalide'],
	[MATRICULES.ibrahimTraore, FEE_SCHOOL, 'MM-CI-2025-011', '-5000', '2025-09-10', 'mobile_money', 'Montant négatif'],
	[MATRICULES.mariamOuattara, FEE_SCHOOL, 'MM-CI-2025-012', '0', '2025-09-10', 'mobile_money', 'Montant nul'],
]);

write('PA07-error-invalid-date.xlsx', HEADERS, [
	[MATRICULES.seydouDiabate, FEE_SCHOOL, 'MM-CI-2025-020', '75000', '15/09/2025', 'mobile_money', 'Format date invalide'],
	[MATRICULES.akissiAssouan, FEE_SCHOOL, 'MM-CI-2025-021', '75000', '2025-13-40', 'mobile_money', 'Date impossible'],
]);

write('PA08-error-amount-exceeds-remaining.xlsx', HEADERS, [
	[MATRICULES.lassinaKonate, FEE_SCHOOL, 'MM-CI-2025-030', '999999999', '2025-09-20', 'virement', 'Dépasse le solde restant'],
]);

write('PA09-mobile-money-modes.xlsx', HEADERS, [
	[MATRICULES.koffiAnan, FEE_SCHOOL, 'OM-CI-2025-001', '50000', '2025-09-22', 'mobile_money', 'Orange Money'],
	[MATRICULES.salimataCoulibaly, FEE_SCHOOL, 'MTN-CI-2025-001', '50000', '2025-09-23', 'mobile_money', 'MTN Mobile Money'],
	[MATRICULES.affoueYeo, FEE_SCHOOL, 'ESP-CI-2025-001', '25000', '2025-09-24', 'espèces', 'Paiement cash en CFA'],
]);

write('PA10-headers-only.xlsx', HEADERS, []);

write('PA01-happy-all-valid.xlsx', HEADERS, [
	[MATRICULES.kouadioYao, FEE_SCHOOL, 'MM-CI-2025-100', '75000', '2025-09-01', 'mobile_money', '1er versement trimestre 1'],
	[MATRICULES.aminataKone, FEE_SCHOOL, 'MM-CI-2025-101', '', '2025-09-02', 'mobile_money', 'Solde restant'],
	[MATRICULES.nguessanKouassi, FEE_SCHOOL, 'VIR-CI-2025-102', '100000', '2025-09-03', 'virement', 'Virement bancaire SGBCI'],
	[MATRICULES.adjouaBamba, FEE_SCHOOL, 'ESP-CI-2025-103', '50000', '2025-09-04', 'espèces', 'Versement à la caisse'],
]);

console.log(`Generated payment import fixtures in ${join(here, 'xlsx')}`);
console.log(`Note: type_frais "${FEE_SCHOOL}" must exist and be assigned to students before PA01.`);

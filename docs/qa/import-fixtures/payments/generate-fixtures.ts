import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { FEE_CATALOG_NAMES } from '../_shared/ivory-coast-data.ts';
import { resolveStudentMatricules } from '../_shared/fixture-pool.ts';
import { loadSchoolImportSnapshot, primaryFeeName } from '../_shared/school-db.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Paiements');
const HEADERS = ['matricule', 'type_frais', 'reference', 'montant', 'date', 'mode', 'notes'] as const;

const snapshot = await loadSchoolImportSnapshot();
const matricules = resolveStudentMatricules(snapshot, 12);
const m = (index: number) => matricules[index % matricules.length]!;
const feeSchool = primaryFeeName(snapshot, FEE_CATALOG_NAMES[0]!);

if (snapshot.fees.length === 0) {
	console.warn(
		`⚠ Aucun frais en base — fallback « ${feeSchool} ». Créez les types de frais + BI01 avant PA01.`,
	);
}

write('PA02-partial-import.xlsx', HEADERS, [
	[m(0), feeSchool, 'MM-CI-2025-001', '75000', '2025-09-15', 'mobile_money', 'Orange Money — 1er trimestre'],
	[m(1), feeSchool, 'MM-CI-2025-002', '', '2025-09-16', 'mobile_money', 'Solde restant automatique'],
	['CI-2025-999', feeSchool, 'MM-CI-2025-003', '50000', '2025-09-17', 'mobile_money', 'Matricule inconnu'],
	[m(2), 'Frais inexistants', 'MM-CI-2025-004', '50000', '2025-09-18', 'espèces', 'Type de frais invalide'],
]);

write('PA03-error-student-not-found.xlsx', HEADERS, [
	['CI-2025-999', feeSchool, 'VIR-CI-2025-001', '150000', '2025-09-10', 'virement', 'Matricule absent'],
	['CI-2025-998', feeSchool, 'VIR-CI-2025-002', '150000', '2025-09-11', 'virement', ''],
]);

write('PA04-error-fee-not-found.xlsx', HEADERS, [
	[m(0), 'Frais de cantine', 'CANT-001', '25000', '2025-09-10', 'espèces', 'Libellé invalide'],
	[m(1), 'Inscription sport', 'SPORT-001', '10000', '2025-09-11', 'espèces', 'Frais non configuré'],
]);

write('PA05-error-missing-required.xlsx', HEADERS, [
	['', feeSchool, 'REF-001', '50000', '2025-09-10', 'espèces', ''],
	[m(0), '', 'REF-002', '50000', '2025-09-10', 'espèces', ''],
	[m(1), feeSchool, '', '50000', '2025-09-10', 'espèces', ''],
]);

write('PA06-error-invalid-amount.xlsx', HEADERS, [
	[m(3), feeSchool, 'MM-CI-2025-010', 'abc', '2025-09-10', 'mobile_money', 'Montant invalide'],
	[m(4), feeSchool, 'MM-CI-2025-011', '-5000', '2025-09-10', 'mobile_money', 'Montant négatif'],
	[m(5), feeSchool, 'MM-CI-2025-012', '0', '2025-09-10', 'mobile_money', 'Montant nul'],
]);

write('PA07-error-invalid-date.xlsx', HEADERS, [
	[m(6), feeSchool, 'MM-CI-2025-020', '75000', '15/09/2025', 'mobile_money', 'Format date invalide'],
	[m(7), feeSchool, 'MM-CI-2025-021', '75000', '2025-13-40', 'mobile_money', 'Date impossible'],
]);

write('PA08-error-amount-exceeds-remaining.xlsx', HEADERS, [
	[m(8), feeSchool, 'MM-CI-2025-030', '999999999', '2025-09-20', 'virement', 'Dépasse le solde restant'],
]);

write('PA09-mobile-money-modes.xlsx', HEADERS, [
	[m(9), feeSchool, 'OM-CI-2025-001', '50000', '2025-09-22', 'mobile_money', 'Orange Money'],
	[m(10), feeSchool, 'MTN-CI-2025-001', '50000', '2025-09-23', 'mobile_money', 'MTN Mobile Money'],
	[m(11), feeSchool, 'ESP-CI-2025-001', '25000', '2025-09-24', 'espèces', 'Paiement cash en CFA'],
]);

write('PA10-headers-only.xlsx', HEADERS, []);

write('PA11-error-duplicate-reference.xlsx', HEADERS, [
	[m(0), feeSchool, 'MM-CI-DUP-001', '50000', '2025-09-25', 'mobile_money', 'Première référence'],
	[m(1), feeSchool, 'mm-ci-dup-001', '50000', '2025-09-26', 'mobile_money', 'Doublon casse insensible'],
	[m(2), feeSchool, 'MM-CI-DUP-002', '50000', '2025-09-27', 'espèces', 'Référence unique OK'],
]);

write('PA01-happy-all-valid.xlsx', HEADERS, [
	[m(0), feeSchool, 'MM-CI-2025-100', '75000', '2025-09-01', 'mobile_money', '1er versement trimestre 1'],
	[m(1), feeSchool, 'MM-CI-2025-101', '', '2025-09-02', 'mobile_money', 'Solde restant'],
	[m(2), feeSchool, 'VIR-CI-2025-102', '100000', '2025-09-03', 'virement', 'Virement bancaire SGBCI'],
	[m(3), feeSchool, 'ESP-CI-2025-103', '50000', '2025-09-04', 'espèces', 'Versement à la caisse'],
]);

console.log(`Generated payment import fixtures in ${join(here, 'xlsx')}`);
console.log(`Note: type_frais "${feeSchool}" must exist and be assigned to students before PA01.`);

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { FEE_CATALOG_NAMES } from '../_shared/ivory-coast-data.ts';
import { resolveStudentMatricules } from '../_shared/fixture-pool.ts';
import { feeNames, loadSchoolImportSnapshot, primaryFeeName } from '../_shared/school-db.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Facturation');
const HEADERS = ['matricule', 'type_frais', 'montant', 'date_echeance'] as const;

const snapshot = await loadSchoolImportSnapshot();
const matricules = resolveStudentMatricules(snapshot, 12);
const m = (index: number) => matricules[index % matricules.length]!;
const fees = feeNames(snapshot, FEE_CATALOG_NAMES);
const feeSchool = primaryFeeName(snapshot, FEE_CATALOG_NAMES[0]!);
const feeAlt = fees[1] ?? fees[0]!;
const feeAlt2 = fees[2] ?? feeAlt;

if (snapshot.fees.length === 0) {
	console.warn(
		`⚠ Aucun frais en base — fallback catalogue QA (${FEE_CATALOG_NAMES.join(', ')}). Créez les types de frais avant d’importer BI01.`,
	);
}

write('BI02-partial-import.xlsx', HEADERS, [
	[m(0), feeSchool, '', '2025-10-15', 'Montant par défaut du type de frais'],
	[m(1), feeSchool, '150000', '2025-10-15', 'Montant explicite'],
	['CI-2025-999', feeSchool, '150000', '2025-10-15', 'Matricule inconnu'],
	[m(2), 'Frais inexistants', '50000', '2025-10-15', 'Type de frais invalide'],
]);

write('BI03-error-student-not-found.xlsx', HEADERS, [
	['CI-2025-999', feeSchool, '150000', '2025-10-10', 'Matricule absent'],
	['CI-2025-998', feeSchool, '', '2025-10-11', ''],
]);

write('BI04-error-fee-not-found.xlsx', HEADERS, [
	[m(0), 'Frais de cantine', '25000', '2025-10-10', 'Libellé invalide'],
	[m(1), 'Inscription sport', '10000', '2025-10-11', 'Frais non configuré'],
]);

write('BI05-error-missing-required.xlsx', HEADERS, [
	['', feeSchool, '150000', '2025-10-10', ''],
	[m(0), '', '150000', '2025-10-10', ''],
]);

write('BI06-error-invalid-amount.xlsx', HEADERS, [
	[m(3), feeSchool, 'abc', '2025-10-10', 'Montant invalide'],
	[m(4), feeSchool, '-5000', '2025-10-10', 'Montant négatif'],
	[m(5), feeSchool, '0', '2025-10-10', 'Montant nul'],
]);

write('BI07-error-invalid-due-date.xlsx', HEADERS, [
	[m(6), feeSchool, '150000', '15/10/2025', 'Format date invalide'],
	[m(7), feeSchool, '150000', '2025-13-40', 'Date impossible'],
]);

write('BI08-error-duplicate-assignment.xlsx', HEADERS, [
	[m(8), feeSchool, '', '2025-10-20', 'Première ligne valide'],
	[m(8), feeSchool, '100000', '2025-11-20', 'Doublon élève + même frais'],
]);

write('BI09-multiple-fee-types.xlsx', HEADERS, [
	[m(9), feeAlt2, '35000', '2025-10-22', 'Frais secondaire'],
	[m(10), feeAlt, '45000', '2025-10-23', 'Frais alternatif'],
	[m(11), feeSchool, '', '2025-10-24', 'Frais principal — montant catalogue'],
]);

write('BI10-headers-only.xlsx', HEADERS, []);

write('BI01-happy-all-valid.xlsx', HEADERS, [
	[m(0), feeSchool, '', '2025-10-01', 'Scolarité T1 — montant par défaut'],
	[m(1), feeSchool, '150000', '2025-10-01', 'Scolarité montant explicite'],
	[m(2), feeSchool, '', '2025-10-05', ''],
	[m(3), feeSchool, '150000', '2025-10-05', 'Échéance fin trimestre'],
]);

console.log(`Generated billing import fixtures in ${join(here, 'xlsx')}`);
console.log(`Prérequis : élèves EL01 + types de frais (${feeSchool}). Ensuite : PA01.`);

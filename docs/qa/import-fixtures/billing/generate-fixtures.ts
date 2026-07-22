import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { FEE_CATALOG_NAMES, FEE_SCHOOL, MATRICULES } from '../_shared/ivory-coast-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Facturation');

const HEADERS = ['matricule', 'type_frais', 'montant', 'date_echeance'] as const;

const CANTINE = FEE_CATALOG_NAMES[2];
const TRANSPORT = FEE_CATALOG_NAMES[1];

write('BI02-partial-import.xlsx', HEADERS, [
	[MATRICULES.kouadioYao, FEE_SCHOOL, '', '2025-10-15', 'Montant par défaut du type de frais'],
	[MATRICULES.aminataKone, FEE_SCHOOL, '150000', '2025-10-15', 'Montant explicite'],
	['CI-2025-999', FEE_SCHOOL, '150000', '2025-10-15', 'Matricule inconnu'],
	[MATRICULES.nguessanKouassi, 'Frais inexistants', '50000', '2025-10-15', 'Type de frais invalide'],
]);

write('BI03-error-student-not-found.xlsx', HEADERS, [
	['CI-2025-999', FEE_SCHOOL, '150000', '2025-10-10', 'Matricule absent'],
	['CI-2025-998', FEE_SCHOOL, '', '2025-10-11', ''],
]);

write('BI04-error-fee-not-found.xlsx', HEADERS, [
	[MATRICULES.kouadioYao, 'Frais de cantine', '25000', '2025-10-10', 'Libellé invalide (attendu : Cantine)'],
	[MATRICULES.aminataKone, 'Inscription sport', '10000', '2025-10-11', 'Frais non configuré'],
]);

write('BI05-error-missing-required.xlsx', HEADERS, [
	['', FEE_SCHOOL, '150000', '2025-10-10', ''],
	[MATRICULES.kouadioYao, '', '150000', '2025-10-10', ''],
]);

write('BI06-error-invalid-amount.xlsx', HEADERS, [
	[MATRICULES.adjouaBamba, FEE_SCHOOL, 'abc', '2025-10-10', 'Montant invalide'],
	[MATRICULES.ibrahimTraore, FEE_SCHOOL, '-5000', '2025-10-10', 'Montant négatif'],
	[MATRICULES.mariamOuattara, FEE_SCHOOL, '0', '2025-10-10', 'Montant nul'],
]);

write('BI07-error-invalid-due-date.xlsx', HEADERS, [
	[MATRICULES.seydouDiabate, FEE_SCHOOL, '150000', '15/10/2025', 'Format date invalide'],
	[MATRICULES.akissiAssouan, FEE_SCHOOL, '150000', '2025-13-40', 'Date impossible'],
]);

write('BI08-error-duplicate-assignment.xlsx', HEADERS, [
	[MATRICULES.lassinaKonate, FEE_SCHOOL, '', '2025-10-20', 'Première ligne valide'],
	[MATRICULES.lassinaKonate, FEE_SCHOOL, '100000', '2025-11-20', 'Doublon élève + même frais'],
]);

write('BI09-multiple-fee-types.xlsx', HEADERS, [
	[MATRICULES.koffiAnan, CANTINE, '35000', '2025-10-22', 'Cantine trimestre 1'],
	[MATRICULES.salimataCoulibaly, TRANSPORT, '45000', '2025-10-23', 'Transport'],
	[MATRICULES.affoueYeo, FEE_SCHOOL, '', '2025-10-24', 'Scolarité — montant catalogue'],
]);

write('BI10-headers-only.xlsx', HEADERS, []);

write('BI01-happy-all-valid.xlsx', HEADERS, [
	[MATRICULES.kouadioYao, FEE_SCHOOL, '', '2025-10-01', 'Scolarité T1 — montant par défaut'],
	[MATRICULES.aminataKone, FEE_SCHOOL, '150000', '2025-10-01', 'Scolarité montant explicite'],
	[MATRICULES.nguessanKouassi, FEE_SCHOOL, '', '2025-10-05', ''],
	[MATRICULES.adjouaBamba, FEE_SCHOOL, '150000', '2025-10-05', 'Échéance fin trimestre'],
]);

console.log(`Generated billing import fixtures in ${join(here, 'xlsx')}`);
console.log(`Prérequis : élèves EL01 + types de frais demo-ci (${FEE_CATALOG_NAMES.join(', ')}).`);
console.log(`Ensuite : import paiements PA01 (frais déjà assignés).`);

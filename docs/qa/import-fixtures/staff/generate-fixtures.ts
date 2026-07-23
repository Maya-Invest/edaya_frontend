import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { PHONES, STAFF_CODES, STAFF_HEADERS } from '../_shared/ivory-coast-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Personnel');

const HEADERS = STAFF_HEADERS;
const C = STAFF_CODES;

write('PE02-partial-import.xlsx', HEADERS, [
	[C.kone, 'Aminata', 'Koné', 'Secrétaire', 'aminata.kone@ecole-ci.edaya.dev', PHONES.secretariat],
	[C.yao, 'Kouadio', 'Yao', 'CPE / Vie scolaire', 'kouadio.yao@ecole-ci.edaya.dev', PHONES.cpe],
	[C.traore, '', 'Traoré', 'Directeur adjoint', 'traore@ecole-ci.edaya.dev', PHONES.traore],
	['PER-DIALLO-001', 'Fatou', 'Diallo', 'Comptable', 'fatou.diallo@ecole-ci.edaya.dev', '+225 07 11 22 33 44'],
]);

write('PE03-error-missing-required.xlsx', HEADERS, [
	['', 'Aminata', 'Koné', 'Secrétaire', 'secretariat@ecole-ci.edaya.dev', PHONES.secretariat],
	[C.yao, '', 'Yao', 'CPE / Vie scolaire', 'cpe@ecole-ci.edaya.dev', PHONES.cpe],
	[C.traore, 'Ibrahim', 'Traoré', '', 'traore@ecole-ci.edaya.dev', PHONES.traore],
]);

write('PE04-error-duplicate-in-file.xlsx', HEADERS, [
	['PER-DIALLO-001', 'Fatou', 'Diallo', 'Secrétaire', 'fatou.diallo@ecole-ci.edaya.dev', PHONES.secretariat],
	['per-diallo-001', 'Fatou', 'Diallo', 'Secrétaire', 'fatou.dup@ecole-ci.edaya.dev', PHONES.secretariat],
	[C.yao, 'Kouadio', 'Yao', 'CPE / Vie scolaire', 'kouadio.yao@ecole-ci.edaya.dev', PHONES.cpe],
]);

write('PE05-unknown-role-warning.xlsx', HEADERS, [
	['PER-CISSE-001', 'Moussa', 'Cissé', 'Comptable', 'moussa.cisse@ecole-ci.edaya.dev', '+225 05 12 34 56 78'],
	['PER-ZONGO-001', 'Awa', 'Zongo', 'Agent d\'entretien', 'awa.zongo@ecole-ci.edaya.dev', '+225 07 23 45 67 89'],
]);

write('PE06-invalid-email-warning.xlsx', HEADERS, [
	['PER-COUL-001', 'Salimata', 'Coulibaly', 'Secrétaire', 'email-invalide', PHONES.secretariat],
	['PER-KONATE-001', 'Lassina', 'Konaté', 'Directeur adjoint', 'lassina@', PHONES.cpe],
]);

write('PE07-headers-only.xlsx', HEADERS, []);

write('PE08-trim-and-case.xlsx', HEADERS, [
	[`  ${C.kone}  `, '  Aminata  ', '  Koné  ', '  Secrétaire  ', '  aminata.kone@ecole-ci.edaya.dev  ', `  ${PHONES.secretariat}  `],
]);

write('PE01-happy-all-valid.xlsx', HEADERS, [
	[C.kone, 'Aminata', 'Koné', 'Secrétaire', 'aminata.kone@ecole-ci.edaya.dev', PHONES.secretariat],
	[C.yao, 'Kouadio', 'Yao', 'CPE / Vie scolaire', 'kouadio.yao@ecole-ci.edaya.dev', PHONES.cpe],
	[C.kouassi, 'N\'Guessan', 'Kouassi', 'Directeur adjoint', 'nguessan.kouassi@ecole-ci.edaya.dev', '+225 05 12 34 56 78'],
	[C.bamba, 'Adjoua', 'Bamba', 'Secrétaire', 'adjoua.bamba@ecole-ci.edaya.dev', '+225 07 23 45 67 89'],
	[C.traore, 'Ibrahim', 'Traoré', 'CPE / Vie scolaire', 'ibrahim.traore@ecole-ci.edaya.dev', PHONES.traore],
	[C.ouattara, 'Mariam', 'Ouattara', 'Directeur', 'mariam.ouattara@ecole-ci.edaya.dev', '+225 01 34 56 78 90'],
]);

console.log(`Generated staff import fixtures in ${join(here, 'xlsx')}`);

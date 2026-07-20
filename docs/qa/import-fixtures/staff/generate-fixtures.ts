import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { PHONES, STAFF_HEADERS } from '../_shared/ivory-coast-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Personnel');

const HEADERS = STAFF_HEADERS;

write('PE02-partial-import.xlsx', HEADERS, [
	['Aminata', 'Koné', 'Secrétaire', 'aminata.kone@ecole-ci.edaya.dev', PHONES.secretariat],
	['Kouadio', 'Yao', 'CPE / Vie scolaire', 'kouadio.yao@ecole-ci.edaya.dev', PHONES.cpe],
	['', 'Traoré', 'Directeur adjoint', 'traore@ecole-ci.edaya.dev', PHONES.traore],
	['Fatou', 'Diallo', 'Comptable', 'fatou.diallo@ecole-ci.edaya.dev', '+225 07 11 22 33 44'],
]);

write('PE03-error-missing-required.xlsx', HEADERS, [
	['', 'Koné', 'Secrétaire', 'secretariat@ecole-ci.edaya.dev', PHONES.secretariat],
	['Kouadio', '', 'CPE / Vie scolaire', 'cpe@ecole-ci.edaya.dev', PHONES.cpe],
	['Ibrahim', 'Traoré', '', 'traore@ecole-ci.edaya.dev', PHONES.traore],
]);

write('PE04-error-duplicate-in-file.xlsx', HEADERS, [
	['Fatou', 'Diallo', 'Secrétaire', 'fatou.diallo@ecole-ci.edaya.dev', PHONES.secretariat],
	['Fatou', 'Diallo', 'Secrétaire', 'fatou.diallo@ecole-ci.edaya.dev', PHONES.secretariat],
	['Kouadio', 'Yao', 'CPE / Vie scolaire', 'kouadio.yao@ecole-ci.edaya.dev', PHONES.cpe],
]);

write('PE05-unknown-role-warning.xlsx', HEADERS, [
	['Moussa', 'Cissé', 'Comptable', 'moussa.cisse@ecole-ci.edaya.dev', '+225 05 12 34 56 78'],
	['Awa', 'Zongo', 'Agent d\'entretien', 'awa.zongo@ecole-ci.edaya.dev', '+225 07 23 45 67 89'],
]);

write('PE06-invalid-email-warning.xlsx', HEADERS, [
	['Salimata', 'Coulibaly', 'Secrétaire', 'email-invalide', PHONES.secretariat],
	['Lassina', 'Konaté', 'Directeur adjoint', 'lassina@', PHONES.cpe],
]);

write('PE07-headers-only.xlsx', HEADERS, []);

write('PE08-trim-and-case.xlsx', HEADERS, [
	['  Aminata  ', '  Koné  ', '  Secrétaire  ', '  aminata.kone@ecole-ci.edaya.dev  ', `  ${PHONES.secretariat}  `],
]);

write('PE01-happy-all-valid.xlsx', HEADERS, [
	['Aminata', 'Koné', 'Secrétaire', 'aminata.kone@ecole-ci.edaya.dev', PHONES.secretariat],
	['Kouadio', 'Yao', 'CPE / Vie scolaire', 'kouadio.yao@ecole-ci.edaya.dev', PHONES.cpe],
	['N\'Guessan', 'Kouassi', 'Directeur adjoint', 'nguessan.kouassi@ecole-ci.edaya.dev', '+225 05 12 34 56 78'],
	['Adjoua', 'Bamba', 'Secrétaire', 'adjoua.bamba@ecole-ci.edaya.dev', '+225 07 23 45 67 89'],
	['Ibrahim', 'Traoré', 'CPE / Vie scolaire', 'ibrahim.traore@ecole-ci.edaya.dev', PHONES.traore],
	['Mariam', 'Ouattara', 'Directeur', 'mariam.ouattara@ecole-ci.edaya.dev', '+225 01 34 56 78 90'],
]);

console.log(`Generated staff import fixtures in ${join(here, 'xlsx')}`);

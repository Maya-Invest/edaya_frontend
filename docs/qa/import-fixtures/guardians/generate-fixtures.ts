import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { MATRICULES, PHONES } from '../_shared/ivory-coast-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Tuteurs');

const HEADERS = ['prenom', 'nom', 'eleve_matricule', 'email', 'telephone'] as const;

write('TU02-partial-import.xlsx', HEADERS, [
	['Aminata', 'Koné', MATRICULES.aminataKone, 'aminata.kone@example.ci', PHONES.aminata],
	['Kouadio', 'Yao', `${MATRICULES.kouadioYao};CI-2025-999`, 'kouadio.yao@example.ci', PHONES.kouadio],
	['', 'Traoré', MATRICULES.ibrahimTraore, 'traore@example.ci', PHONES.traore],
]);

write('TU03-error-missing-required.xlsx', HEADERS, [
	['', 'Koné', MATRICULES.aminataKone, 'aminata@example.ci', PHONES.aminata],
	['Kouadio', '', MATRICULES.kouadioYao, 'yao@example.ci', PHONES.kouadio],
	['Ibrahim', 'Traoré', '', 'traore@example.ci', PHONES.traore],
]);

write('TU04-error-student-not-found.xlsx', HEADERS, [
	['Fatou', 'Diallo', 'CI-2025-999', 'fatou@example.ci', '+225 07 11 22 33 44'],
	['Moussa', 'Cissé', 'CI-2025-998;CI-2025-997', 'moussa@example.ci', '+225 05 55 66 77 88'],
]);

write('TU05-multi-matricule-siblings.xlsx', HEADERS, [
	['Affoué', 'Yéo', `${MATRICULES.kouadioYao};${MATRICULES.aminataKone}`, 'affoue.yeo@example.ci', '+225 07 90 12 34 56'],
]);

write('TU06-error-duplicate-in-file.xlsx', HEADERS, [
	['Aminata', 'Koné', MATRICULES.adjouaBamba, 'aminata.tuteur@example.ci', PHONES.aminata],
	['Aminata', 'Koné', MATRICULES.adjouaBamba, 'aminata.tuteur2@example.ci', PHONES.aminata],
	['Kouadio', 'Yao', MATRICULES.nguessanKouassi, 'yao@example.ci', PHONES.kouadio],
]);

write('TU07-headers-only.xlsx', HEADERS, []);

write('TU08-trim-and-case.xlsx', HEADERS, [
	['  Aminata  ', '  Koné  ', `  ${MATRICULES.mariamOuattara}  `, '  aminata@example.ci  ', `  ${PHONES.aminata}  `],
]);

write('TU01-happy-all-valid.xlsx', HEADERS, [
	['Aminata', 'Koné', MATRICULES.kouadioYao, 'aminata.kone.tuteur@example.ci', PHONES.aminata],
	['Kouadio', 'Yao', MATRICULES.aminataKone, 'kouadio.yao.tuteur@example.ci', PHONES.kouadio],
	['N\'Guessan', 'Kouassi', MATRICULES.nguessanKouassi, 'nguessan.kouassi@example.ci', '+225 05 12 34 56 78'],
	['Adjoua', 'Bamba', MATRICULES.adjouaBamba, 'adjoua.bamba@example.ci', '+225 07 23 45 67 89'],
	['Ibrahim', 'Traoré', MATRICULES.ibrahimTraore, 'ibrahim.traore@example.ci', PHONES.traore],
	['Mariam', 'Ouattara', MATRICULES.mariamOuattara, 'mariam.ouattara@example.ci', '+225 01 34 56 78 90'],
	['Seydou', 'Diabaté', MATRICULES.seydouDiabate, 'seydou.diabate@example.ci', '+225 07 45 67 89 01'],
	['Akissi', 'Assouan', MATRICULES.akissiAssouan, 'akissi.assouan@example.ci', '+225 05 56 78 90 12'],
]);

console.log(`Generated guardian import fixtures in ${join(here, 'xlsx')}`);

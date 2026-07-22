import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { PHONES, TEACHER_HEADERS } from '../_shared/ivory-coast-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Enseignants');

const HEADERS = TEACHER_HEADERS;

write('EN02-partial-import.xlsx', HEADERS, [
	['Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', PHONES.kouadio],
	['Mme', 'Assi', 'f.assi@ecole-ci.edaya.dev', '+225 05 11 22 33 44'],
	['', 'Zongo', 'm.zongo@ecole-ci.edaya.dev', '+225 01 44 55 66 77'],
]);

write('EN03-error-missing-required.xlsx', HEADERS, [
	['', 'Aka', 'j.aka@ecole-ci.edaya.dev', PHONES.kouadio],
	['Mme', '', 'f.assi@ecole-ci.edaya.dev', '+225 05 11 22 33 44'],
]);

write('EN04-invalid-email-warning.xlsx', HEADERS, [
	['Koffi', 'Anan', 'k.anan@ecole-ci.edaya.dev', '+225 07 55 66 77 88'],
	['Salimata', 'Coulibaly', 'pas-un-email', '+225 05 66 77 88 99'],
]);

write('EN05-error-duplicate-in-file.xlsx', HEADERS, [
	['Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', PHONES.kouadio],
	['Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', PHONES.kouadio],
	['Mme', 'Assi', 'f.assi@ecole-ci.edaya.dev', '+225 05 11 22 33 44'],
]);

write('EN06-headers-only.xlsx', HEADERS, []);

write('EN07-trim-and-case.xlsx', HEADERS, [
	['  Jean-Baptiste  ', '  Aka  ', '  j.aka@ecole-ci.edaya.dev  ', `  ${PHONES.kouadio}  `],
]);

write('EN01-happy-all-valid.xlsx', HEADERS, [
	['Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', PHONES.kouadio],
	['Mme', 'Assi', 'f.assi@ecole-ci.edaya.dev', '+225 05 11 22 33 44'],
	['M.', 'Gbé', 'p.gbe@ecole-ci.edaya.dev', '+225 07 33 44 55 66'],
	['Mme', 'Zongo', 'm.zongo@ecole-ci.edaya.dev', '+225 01 44 55 66 77'],
	['Aminata', 'Koné', 'a.kone@ecole-ci.edaya.dev', PHONES.aminata],
	['Kouadio', 'Yao', 'k.yao@ecole-ci.edaya.dev', PHONES.traore],
]);

console.log(`Generated teacher import fixtures in ${join(here, 'xlsx')}`);

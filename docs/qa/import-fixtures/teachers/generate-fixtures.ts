import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { PHONES, TEACHER_CODES, TEACHER_HEADERS } from '../_shared/ivory-coast-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Enseignants');

const HEADERS = TEACHER_HEADERS;
const C = TEACHER_CODES;

write('EN02-partial-import.xlsx', HEADERS, [
	[C.aka, 'Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', PHONES.kouadio],
	[C.assi, 'Mme', 'Assi', 'f.assi@ecole-ci.edaya.dev', '+225 05 11 22 33 44'],
	[C.zongo, '', 'Zongo', 'm.zongo@ecole-ci.edaya.dev', '+225 01 44 55 66 77'],
]);

write('EN03-error-missing-required.xlsx', HEADERS, [
	['', 'Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', PHONES.kouadio],
	[C.assi, '', 'Assi', 'f.assi@ecole-ci.edaya.dev', '+225 05 11 22 33 44'],
	[C.gbe, 'M.', '', 'p.gbe@ecole-ci.edaya.dev', '+225 07 33 44 55 66'],
]);

write('EN04-invalid-email-warning.xlsx', HEADERS, [
	['ENS-ANAN-001', 'Koffi', 'Anan', 'k.anan@ecole-ci.edaya.dev', '+225 07 55 66 77 88'],
	['ENS-COUL-001', 'Salimata', 'Coulibaly', 'pas-un-email', '+225 05 66 77 88 99'],
]);

write('EN05-error-duplicate-in-file.xlsx', HEADERS, [
	[C.aka, 'Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', PHONES.kouadio],
	['ens-aka-001', 'Jean-Baptiste', 'Aka', 'j.aka.dup@ecole-ci.edaya.dev', PHONES.kouadio],
	[C.assi, 'Mme', 'Assi', 'f.assi@ecole-ci.edaya.dev', '+225 05 11 22 33 44'],
]);

write('EN06-headers-only.xlsx', HEADERS, []);

write('EN07-trim-and-case.xlsx', HEADERS, [
	[`  ${C.aka}  `, '  Jean-Baptiste  ', '  Aka  ', '  j.aka@ecole-ci.edaya.dev  ', `  ${PHONES.kouadio}  `],
]);

write('EN08-no-email-ok.xlsx', HEADERS, [
	['ENS-SANS-MAIL-001', 'Lassina', 'Konaté', '', '+225 07 88 99 00 11'],
]);

write('EN01-happy-all-valid.xlsx', HEADERS, [
	[C.aka, 'Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', PHONES.kouadio],
	[C.assi, 'Mme', 'Assi', 'f.assi@ecole-ci.edaya.dev', '+225 05 11 22 33 44'],
	[C.gbe, 'M.', 'Gbé', 'p.gbe@ecole-ci.edaya.dev', '+225 07 33 44 55 66'],
	[C.zongo, 'Mme', 'Zongo', 'm.zongo@ecole-ci.edaya.dev', '+225 01 44 55 66 77'],
	[C.kone, 'Aminata', 'Koné', 'a.kone@ecole-ci.edaya.dev', PHONES.aminata],
	[C.yao, 'Kouadio', 'Yao', 'k.yao@ecole-ci.edaya.dev', PHONES.traore],
]);

console.log(`Generated teacher import fixtures in ${join(here, 'xlsx')}`);

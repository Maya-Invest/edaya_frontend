import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { PHONES, TEACHER_HEADERS, TEACHER_SUBJECT_NAMES } from '../_shared/ivory-coast-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Enseignants');

const HEADERS = TEACHER_HEADERS;
const S = TEACHER_SUBJECT_NAMES;

write('EN02-partial-import.xlsx', HEADERS, [
	['Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', S.maths, PHONES.kouadio],
	['Mme', 'Assi', 'f.assi@ecole-ci.edaya.dev', 'Espagnol', '+225 05 11 22 33 44'],
	['M.', 'Gbé', 'p.gbe@ecole-ci.edaya.dev', S.francais, '+225 07 33 44 55 66'],
	['', 'Zongo', 'm.zongo@ecole-ci.edaya.dev', S.anglais, '+225 01 44 55 66 77'],
]);

write('EN03-error-missing-required.xlsx', HEADERS, [
	['', 'Aka', 'j.aka@ecole-ci.edaya.dev', S.maths, PHONES.kouadio],
	['Mme', '', 'f.assi@ecole-ci.edaya.dev', S.francais, '+225 05 11 22 33 44'],
]);

write('EN04-unknown-subject-warning.xlsx', HEADERS, [
	['Koffi', 'Anan', 'k.anan@ecole-ci.edaya.dev', 'Espagnol', '+225 07 55 66 77 88'],
	['Salimata', 'Coulibaly', 's.coulibaly@ecole-ci.edaya.dev', 'Allemand', '+225 05 66 77 88 99'],
]);

write('EN05-multi-subjects.xlsx', HEADERS, [
	['M.', 'Gbé', 'p.gbe@ecole-ci.edaya.dev', `${S.maths}; ${S.physique}`, '+225 07 33 44 55 66'],
	['Mme', 'Zongo', 'm.zongo@ecole-ci.edaya.dev', `${S.francais}; ${S.anglais}`, '+225 01 44 55 66 77'],
]);

write('EN06-error-duplicate-in-file.xlsx', HEADERS, [
	['Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', S.maths, PHONES.kouadio],
	['Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', S.maths, PHONES.kouadio],
	['Mme', 'Assi', 'f.assi@ecole-ci.edaya.dev', S.francais, '+225 05 11 22 33 44'],
]);

write('EN07-headers-only.xlsx', HEADERS, []);

write('EN08-trim-and-case.xlsx', HEADERS, [
	['  Jean-Baptiste  ', '  Aka  ', '  j.aka@ecole-ci.edaya.dev  ', `  ${S.maths}  `, `  ${PHONES.kouadio}  `],
]);

write('EN01-happy-all-valid.xlsx', HEADERS, [
	['Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', S.maths, PHONES.kouadio],
	['Mme', 'Assi', 'f.assi@ecole-ci.edaya.dev', S.francais, '+225 05 11 22 33 44'],
	['M.', 'Gbé', 'p.gbe@ecole-ci.edaya.dev', S.svt, '+225 07 33 44 55 66'],
	['Mme', 'Zongo', 'm.zongo@ecole-ci.edaya.dev', S.anglais, '+225 01 44 55 66 77'],
	['Aminata', 'Koné', 'a.kone@ecole-ci.edaya.dev', S.hg, PHONES.aminata],
	['Kouadio', 'Yao', 'k.yao@ecole-ci.edaya.dev', `${S.maths}; ${S.physique}`, PHONES.traore],
]);

console.log(`Generated teacher import fixtures in ${join(here, 'xlsx')}`);
console.log(`Note: import SU01 before EN01 so subject names resolve in the catalog.`);

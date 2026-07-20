import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import { CLASSES, PHONES, TEACHER_HEADERS, TEACHER_SUBJECT_NAMES } from '../_shared/ivory-coast-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Enseignants');

const HEADERS = TEACHER_HEADERS;
const S = TEACHER_SUBJECT_NAMES;

write('EN02-partial-import.xlsx', HEADERS, [
	['Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', S.maths, PHONES.kouadio, CLASSES.sixA],
	['Mme', 'Assi', 'f.assi@ecole-ci.edaya.dev', 'Espagnol', '+225 05 11 22 33 44', CLASSES.sixA],
	['M.', 'Gbé', 'p.gbe@ecole-ci.edaya.dev', S.francais, '+225 07 33 44 55 66', CLASSES.sixA],
	['', 'Zongo', 'm.zongo@ecole-ci.edaya.dev', S.anglais, '+225 01 44 55 66 77', CLASSES.sixB],
]);

write('EN03-error-missing-required.xlsx', HEADERS, [
	['', 'Aka', 'j.aka@ecole-ci.edaya.dev', S.maths, PHONES.kouadio, CLASSES.sixA],
	['Mme', '', 'f.assi@ecole-ci.edaya.dev', S.francais, '+225 05 11 22 33 44', CLASSES.sixA],
]);

write('EN04-unknown-subject-warning.xlsx', HEADERS, [
	['Koffi', 'Anan', 'k.anan@ecole-ci.edaya.dev', 'Espagnol', '+225 07 55 66 77 88', CLASSES.fourB],
	['Salimata', 'Coulibaly', 's.coulibaly@ecole-ci.edaya.dev', 'Allemand', '+225 05 66 77 88 99', CLASSES.threeA],
]);

write('EN05-multi-subjects.xlsx', HEADERS, [
	['M.', 'Gbé', 'p.gbe@ecole-ci.edaya.dev', `${S.maths}; ${S.physique}`, '+225 07 33 44 55 66', CLASSES.fiveA],
	['Mme', 'Zongo', 'm.zongo@ecole-ci.edaya.dev', `${S.francais}; ${S.anglais}`, '+225 01 44 55 66 77', CLASSES.sixA],
]);

write('EN06-error-duplicate-in-file.xlsx', HEADERS, [
	['Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', S.maths, PHONES.kouadio, CLASSES.sixA],
	['Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', S.maths, PHONES.kouadio, CLASSES.sixA],
	['Mme', 'Assi', 'f.assi@ecole-ci.edaya.dev', S.francais, '+225 05 11 22 33 44', CLASSES.sixA],
]);

write('EN07-headers-only.xlsx', HEADERS, []);

write('EN08-trim-and-case.xlsx', HEADERS, [
	['  Jean-Baptiste  ', '  Aka  ', '  j.aka@ecole-ci.edaya.dev  ', `  ${S.maths}  `, `  ${PHONES.kouadio}  `, `  ${CLASSES.sixA}  `],
]);

/** Cas Kouadio Yao : multi-matières sans classe → warning + 0 affectation auto à l'import. */
write('EN09-multi-subjects-without-class.xlsx', HEADERS, [
	['Kouadio', 'Yao', 'k.yao@ecole-ci.edaya.dev', `${S.maths}; ${S.physique}`, PHONES.traore, ''],
	['Mme', 'Zongo', 'm.zongo@ecole-ci.edaya.dev', `${S.francais}; ${S.anglais}`, '+225 01 44 55 66 77', ''],
]);

write('EN01-happy-all-valid.xlsx', HEADERS, [
	['Jean-Baptiste', 'Aka', 'j.aka@ecole-ci.edaya.dev', S.maths, PHONES.kouadio, CLASSES.sixA],
	['Mme', 'Assi', 'f.assi@ecole-ci.edaya.dev', S.francais, '+225 05 11 22 33 44', CLASSES.sixA],
	['M.', 'Gbé', 'p.gbe@ecole-ci.edaya.dev', S.svt, '+225 07 33 44 55 66', CLASSES.sixA],
	['Mme', 'Zongo', 'm.zongo@ecole-ci.edaya.dev', S.anglais, '+225 01 44 55 66 77', CLASSES.sixB],
	['Aminata', 'Koné', 'a.kone@ecole-ci.edaya.dev', S.hg, PHONES.aminata, CLASSES.sixA],
	['Kouadio', 'Yao', 'k.yao@ecole-ci.edaya.dev', `${S.maths}; ${S.physique}`, PHONES.traore, CLASSES.fiveA],
]);

console.log(`Generated teacher import fixtures in ${join(here, 'xlsx')}`);
console.log(`Note: import SU01 before EN01 so subject names resolve in the catalog.`);

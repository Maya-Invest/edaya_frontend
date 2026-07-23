import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import {
	PHONES,
	TEACHER_CODES,
	TEACHER_HEADERS,
	TEACHERS_EN01,
	teacherToRow,
} from '../_shared/ivory-coast-data.ts';
import { loadSchoolImportSnapshot } from '../_shared/school-db.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Enseignants');

const HEADERS = TEACHER_HEADERS;
const C = TEACHER_CODES;

const snapshot = await loadSchoolImportSnapshot();
if (snapshot.teachers.length > 0) {
	console.log(`Note: ${snapshot.teachers.length} enseignants déjà en base — EN01 reste un jeu de création (codes QA).`);
}

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
	['ENS-ANAN-QA', 'Koffi', 'Anan', 'k.anan@ecole-ci.edaya.dev', '+225 07 55 66 77 88'],
	['ENS-COUL-QA', 'Salimata', 'Coulibaly', 'pas-un-email', '+225 05 66 77 88 99'],
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

write('EN01-happy-all-valid.xlsx', HEADERS, (() => {
	if (snapshot.teachers.length > 0) {
		return snapshot.teachers.map(teacher => [
			teacher.code,
			teacher.prenom,
			teacher.nom,
			teacher.email ?? '',
			teacher.telephone ?? '',
		]);
	}
	return TEACHERS_EN01.map(teacherToRow);
})());

const en01Count = snapshot.teachers.length > 0 ? snapshot.teachers.length : TEACHERS_EN01.length;
console.log(`Generated teacher import fixtures in ${join(here, 'xlsx')} (${en01Count} teachers in EN01${snapshot.teachers.length > 0 ? ' from DB' : ''})`);


import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import {
	CLASSES,
	TEACHER_ASSIGNMENT_HEADERS,
	TEACHER_CODES,
	TEACHER_SUBJECT_NAMES,
} from '../_shared/ivory-coast-data.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Affectations');

const HEADERS = TEACHER_ASSIGNMENT_HEADERS;
const S = TEACHER_SUBJECT_NAMES;
const C = TEACHER_CODES;

write('TA02-partial-import.xlsx', HEADERS, [
	[C.aka, CLASSES.sixA, S.maths],
	['ENS-INCONNU-999', CLASSES.sixA, S.francais],
	[C.zongo, '6eme Z', S.anglais],
	[C.gbe, CLASSES.sixA, 'Espagnol'],
]);

write('TA03-error-missing-required.xlsx', HEADERS, [
	['', CLASSES.sixA, S.maths],
	[C.assi, '', S.francais],
	[C.zongo, CLASSES.sixA, ''],
]);

write('TA04-subject-not-in-class.xlsx', HEADERS, [
	[C.yao, CLASSES.sixA, S.physique],
]);

write('TA05-error-duplicate-in-file.xlsx', HEADERS, [
	[C.aka, CLASSES.sixA, S.maths],
	[C.aka, CLASSES.sixA, S.maths],
]);

write('TA06-headers-only.xlsx', HEADERS, []);

write('TA07-teacher-without-email.xlsx', HEADERS, [
	['ENS-SANS-MAIL-001', CLASSES.sixA, S.anglais],
]);

write('TA01-happy-all-valid.xlsx', HEADERS, [
	[C.aka, CLASSES.sixA, S.maths],
	[C.assi, CLASSES.sixA, S.francais],
	[C.gbe, CLASSES.sixA, S.svt],
	[C.zongo, CLASSES.sixB, S.anglais],
	[C.kone, CLASSES.sixA, S.hg],
	[C.yao, CLASSES.fiveA, S.maths],
	[C.yao, CLASSES.fiveA, S.physique],
]);

console.log(`Generated teacher-assignment import fixtures in ${join(here, 'xlsx')}`);
console.log('Prerequisites: EN01 teachers + CL01 classes + SU01 subjects (codes alignés TEACHER_CODES).');

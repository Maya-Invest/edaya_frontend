import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import {
	TEACHER_ASSIGNMENT_HEADERS,
	TEACHER_CODES,
	TEACHERS_EN01,
} from '../_shared/ivory-coast-data.ts';
import {
	loadSchoolImportSnapshot,
	primaryClass,
	unknownClassName,
} from '../_shared/school-db.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Affectations');
const HEADERS = TEACHER_ASSIGNMENT_HEADERS;
const C = TEACHER_CODES;

const snapshot = await loadSchoolImportSnapshot();
const offerings = snapshot.classSubjectOfferings;
if (offerings.length === 0) {
	throw new Error('No offered class_subjects in DB — cannot build TA01.');
}

writeFileSync(join(here, 'class-subject-offerings.json'), `${JSON.stringify(offerings, null, 2)}\n`);

const primary = primaryClass(snapshot);
const unknownClass = unknownClassName(snapshot);
const primarySubject = offerings.find(entry => entry.classe === primary.name)?.matiere
	?? offerings[0]!.matiere;
const secondarySubject = offerings.find(
	entry => entry.classe === primary.name && entry.matiere !== primarySubject,
)?.matiere ?? offerings[1]?.matiere ?? primarySubject;
const primarySubjects = new Set(
	offerings.filter(entry => entry.classe === primary.name).map(entry => entry.matiere),
);
const subjectNotInPrimary = offerings.map(entry => entry.matiere).find(name => !primarySubjects.has(name))
	?? 'Matière Hors Classe QA';

/**
 * Affecte chaque offre classe×matière à un enseignant du pool EN01 (round-robin).
 */
function buildHappyAssignmentRows(
	classSubjects: readonly { classe: string; matiere: string }[],
	teacherCodes: readonly string[],
): (string | number)[][] {
	if (teacherCodes.length === 0) {
		throw new Error('TEACHERS_EN01 is empty — cannot build TA01');
	}

	const sorted = [...classSubjects].sort((a, b) => {
		const classCmp = a.classe.localeCompare(b.classe, 'fr');
		if (classCmp !== 0) return classCmp;
		return a.matiere.localeCompare(b.matiere, 'fr');
	});

	return sorted.map((offering, index) => [
		teacherCodes[index % teacherCodes.length]!,
		offering.classe,
		offering.matiere,
	]);
}

write('TA02-partial-import.xlsx', HEADERS, [
	[C.aka, primary.name, primarySubject],
	['ENS-INCONNU-999', primary.name, secondarySubject],
	[C.zongo, unknownClass, primarySubject],
	[C.gbe, primary.name, 'Espagnol Fantôme QA'],
]);

write('TA03-error-missing-required.xlsx', HEADERS, [
	['', primary.name, primarySubject],
	[C.assi, '', secondarySubject],
	[C.zongo, primary.name, ''],
]);

write('TA04-subject-not-in-class.xlsx', HEADERS, [
	[C.yao, primary.name, subjectNotInPrimary],
]);

write('TA05-error-duplicate-in-file.xlsx', HEADERS, [
	[C.aka, primary.name, primarySubject],
	[C.aka, primary.name, primarySubject],
]);

write('TA06-headers-only.xlsx', HEADERS, []);

write('TA07-teacher-without-email.xlsx', HEADERS, [
	['ENS-SANS-MAIL-001', primary.name, primarySubject],
]);

const teacherCodes = snapshot.teachers.length > 0
	? snapshot.teachers.map(teacher => teacher.code)
	: TEACHERS_EN01.map(teacher => teacher.code);
const ta01Rows = buildHappyAssignmentRows(offerings, teacherCodes);
write('TA01-happy-all-valid.xlsx', HEADERS, ta01Rows);

console.log(`Generated teacher-assignment import fixtures in ${join(here, 'xlsx')}`);
console.log(`TA01: ${ta01Rows.length} affectations sur ${teacherCodes.length} enseignants (${snapshot.teachers.length > 0 ? 'codes DB' : 'TEACHERS_EN01'}).`);

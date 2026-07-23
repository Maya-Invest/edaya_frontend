import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';
import {
	loadSchoolImportSnapshot,
	primaryNiveau,
	secondaryNiveau,
} from '../_shared/school-db.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Chapitres');
const HEADERS = ['niveau', 'matiere', 'titre', 'ordre', 'description'] as const;

const snapshot = await loadSchoolImportSnapshot();
const niveau = primaryNiveau(snapshot);
const niveau2 = secondaryNiveau(snapshot);

/** Paires niveau×matière réellement proposées (évite « matière absente »). */
const pairs = snapshot.subjectsAtLevel.length > 0
	? snapshot.subjectsAtLevel
	: snapshot.classSubjectOfferings.map(entry => {
		const classe = snapshot.classes.find(c => c.name === entry.classe);
		return { niveau: classe?.niveau ?? niveau, matiere: entry.matiere };
	});

if (pairs.length === 0) {
	throw new Error('No subjects at level in DB — cannot build chapter fixtures.');
}

const existingKeys = new Set(
	snapshot.chapters.map(chapter => `${chapter.niveau}::${chapter.matiere}::${chapter.titre}`.toLowerCase()),
);

function pickPair(index: number) {
	return pairs[index % pairs.length]!;
}

/** Nouveaux titres QA (non présents en base) pour le happy path d’import. */
const CHAPTERS_HAPPY: (string | number)[][] = [];
for (let i = 0; i < 10; i += 1) {
	const pair = pickPair(i);
	let titre = `Import QA — Module ${i + 1}`;
	let suffix = 1;
	while (existingKeys.has(`${pair.niveau}::${pair.matiere}::${titre}`.toLowerCase())) {
		suffix += 1;
		titre = `Import QA — Module ${i + 1}.${suffix}`;
	}
	existingKeys.add(`${pair.niveau}::${pair.matiere}::${titre}`.toLowerCase());
	CHAPTERS_HAPPY.push([
		pair.niveau,
		pair.matiere,
		titre,
		i + 1,
		`Chapitre généré pour QA import (${pair.niveau} / ${pair.matiere})`,
	]);
}

const sample = CHAPTERS_HAPPY[0]!;
const sampleFr = CHAPTERS_HAPPY.find(row => String(row[1]).toLowerCase().includes('franç'))
	?? CHAPTERS_HAPPY[1]
	?? sample;

write('CH02-partial-import.xlsx', HEADERS, [
	sample,
	sampleFr,
	['', String(sample[1]), 'Chapitre sans niveau', 1, ''],
	[niveau, 'Latin', 'Declinaisons', 1, 'Matière absente du catalogue'],
	[niveau, String(sample[1]), 'Ordre invalide', 'abc', ''],
]);

write('CH03-error-unknown-niveau.xlsx', HEADERS, [
	['7eme Z', String(sample[1]), 'Chapitre test', 1, ''],
	['Terminale X', String(sampleFr[1]), 'Autre chapitre', 1, ''],
]);

write('CH04-error-subject-not-found.xlsx', HEADERS, [
	[niveau, 'Latin', 'Les déclinaisons', 1, 'Matière non proposée'],
	[niveau2, 'Matière Fantôme QA', 'Introduction', 1, 'Matière absente'],
]);

write('CH05-error-missing-required.xlsx', HEADERS, [
	['', String(sample[1]), 'Sans niveau', 1, ''],
	[niveau, '', 'Sans matière', 1, ''],
	[niveau, String(sample[1]), '', 1, ''],
]);

write('CH06-error-invalid-order.xlsx', HEADERS, [
	[niveau, String(sample[1]), 'Chapitre ordre invalide', 'zero', ''],
	[niveau, String(sampleFr[1]), 'Chapitre ordre négatif', -2, ''],
]);

write('CH07-error-duplicate-in-file.xlsx', HEADERS, [
	[niveau, String(sample[1]), 'Les proportions QA', 4, ''],
	[niveau, String(sample[1]), 'Les proportions QA', 5, 'Doublon titre + matière + niveau'],
	[niveau, String(sampleFr[1]), 'Greetings QA', 1, ''],
]);

write('CH08-headers-only.xlsx', HEADERS, []);

write('CH09-trim-and-case.xlsx', HEADERS, [
	[`  ${sample[0]}  `, `  ${sample[1]}  `, '  My family QA  ', '  1  ', '  Vocabulary  '],
]);

write('CH10-error-existing-chapter.xlsx', HEADERS, [
	[sample[0]!, sample[1]!, sample[2]!, 99, 'Doublon catalogue (après CH01)'],
]);

write('CH01-happy-all-valid.xlsx', HEADERS, CHAPTERS_HAPPY);

console.log(`Generated chapter import fixtures in ${join(here, 'xlsx')}`);
console.log(`CH01: ${CHAPTERS_HAPPY.length} chapitres QA sur paires niveau×matière DB`);

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createXlsxWriter } from '../_shared/xlsx-writer.ts';

const here = dirname(fileURLToPath(import.meta.url));
const write = createXlsxWriter(join(here, 'xlsx'), 'Chapitres');

const HEADERS = ['niveau', 'matiere', 'titre', 'ordre', 'description'] as const;

const CHAPTERS_HAPPY = [
	['6ème', 'Mathématiques', 'Les nombres entiers naturels', 1, 'Opérations sur les entiers — programme collège CI'],
	['6ème', 'Mathématiques', 'Les fractions', 2, 'Fractions simples et comparaison'],
	['6ème', 'Mathématiques', 'Géométrie plane', 3, 'Segments, angles et figures usuelles'],
	['6ème', 'Français', 'La conjugaison', 1, 'Présent, imparfait et passé simple'],
	['6ème', 'Français', 'Le récit', 2, 'Structure du récit et personnages'],
	['6ème', 'Sciences de la Vie et de la Terre', 'Le vivant et son environnement', 1, 'Découverte du monde vivant'],
	['6ème', 'Histoire-Géographie', 'L\'Afrique de l\'Ouest', 1, 'Espaces, peuples et échanges régionaux'],
	['6ème', 'Histoire-Géographie', 'La Côte d\'Ivoire indépendante', 2, 'De 1960 à nos jours'],
	['5ème', 'Mathématiques', 'Les nombres relatifs', 1, 'Introduction aux entiers relatifs'],
	['5ème', 'Physique-Chimie', 'La matière et ses états', 1, 'Solide, liquide, gaz — observations'],
] as const;

write('CH02-partial-import.xlsx', HEADERS, [
	CHAPTERS_HAPPY[0]!,
	CHAPTERS_HAPPY[3]!,
	['', 'Français', 'Chapitre sans niveau', 1, ''],
	['6ème', 'Latin', 'Declinaisons', 1, 'Matière absente du catalogue'],
	['6ème', 'Mathématiques', 'Ordre invalide', 'abc', ''],
]);

write('CH03-error-unknown-niveau.xlsx', HEADERS, [
	['7ème Z', 'Mathématiques', 'Chapitre test', 1, ''],
	['Terminale X', 'Français', 'Autre chapitre', 1, ''],
]);

write('CH04-error-subject-not-found.xlsx', HEADERS, [
	['6ème', 'Latin', 'Les déclinaisons', 1, 'Matière non proposée au 6ème'],
	['5ème', 'Philosophie', 'Introduction', 1, 'Matière absente du collège'],
]);

write('CH05-error-missing-required.xlsx', HEADERS, [
	['', 'Mathématiques', 'Sans niveau', 1, ''],
	['6ème', '', 'Sans matière', 1, ''],
	['6ème', 'Français', '', 1, ''],
]);

write('CH06-error-invalid-order.xlsx', HEADERS, [
	['6ème', 'Mathématiques', 'Chapitre ordre invalide', 'zero', ''],
	['6ème', 'Français', 'Chapitre ordre négatif', -2, ''],
]);

write('CH07-error-duplicate-in-file.xlsx', HEADERS, [
	['6ème', 'Mathématiques', 'Les proportions', 4, ''],
	['6ème', 'Mathématiques', 'Les proportions', 5, 'Doublon titre + matière + niveau'],
	['6ème', 'Anglais', 'Greetings', 1, ''],
]);

write('CH08-headers-only.xlsx', HEADERS, []);

write('CH09-trim-and-case.xlsx', HEADERS, [
	['  6ème  ', '  Anglais  ', '  My family  ', '  1  ', '  Vocabulary  '],
]);

write('CH01-happy-all-valid.xlsx', HEADERS, [...CHAPTERS_HAPPY]);

console.log(`Generated chapter import fixtures in ${join(here, 'xlsx')}`);

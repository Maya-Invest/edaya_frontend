/**
 * Pools synthétiques dérivés du snapshot école (élèves à importer, etc.).
 * Utilisé quand la base n’a pas encore d’élèves / pour les chaînes guardians → billing → payments.
 */
import type { SchoolClass, SchoolImportSnapshot } from './school-db.ts';
import { requireClasses } from './school-db.ts';
import type { StudentFixture } from './ivory-coast-data.ts';

const FIRST_NAMES = [
	'Kouadio', 'Aminata', "N'Guessan", 'Adjoua', 'Ibrahim', 'Mariam', 'Seydou', 'Akissi',
	'Lassina', 'Affoué', 'Koffi', 'Salimata', 'Bakary', 'Aïcha', 'Moussa', 'Rokia',
	'Yves', 'Christelle', 'Serge', 'Patricia', 'Didier', 'Estelle', 'Hamed', 'Nadège',
] as const;

const LAST_NAMES = [
	'Yao', 'Koné', 'Kouassi', 'Bamba', 'Traoré', 'Ouattara', 'Diabaté', 'Assouan',
	'Konaté', 'Yéo', 'Anan', 'Coulibaly', 'Silué', 'Sangaré', 'Fofana', 'Camara',
	'Koffi', 'Blé', 'Gnaly', 'Ehui', 'Brou', 'Ncho', 'Soro', 'Diarra',
] as const;

function padMatricule(index: number): string {
	return `CI-2025-${String(index).padStart(3, '0')}`;
}

function birthDateForIndex(index: number): string {
	const year = 2010 + (index % 6);
	const month = String((index % 12) + 1).padStart(2, '0');
	const day = String((index % 27) + 1).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** Construit un jeu d’élèves à importer, un par classe (puis round-robin jusqu’à `count`). */
export function buildImportStudents(
	snapshot: SchoolImportSnapshot,
	count = 12,
): StudentFixture[] {
	const classes = requireClasses(snapshot);
	const students: StudentFixture[] = [];

	for (let i = 0; i < count; i += 1) {
		const classe = classes[i % classes.length]!;
		students.push({
			prenom: FIRST_NAMES[i % FIRST_NAMES.length]!,
			nom: LAST_NAMES[i % LAST_NAMES.length]!,
			matricule: padMatricule(i + 1),
			classe: classe.name,
			date_naissance: birthDateForIndex(i),
			genre: i % 2 === 0 ? 'M' : 'F',
		});
	}

	return students;
}

/**
 * Matricules pour tuteurs / facturation / paiements :
 * préfère les élèves déjà en base, sinon le pool d’import synthétique.
 */
export function resolveStudentMatricules(
	snapshot: SchoolImportSnapshot,
	count = 12,
): string[] {
	if (snapshot.students.length > 0) {
		return snapshot.students.slice(0, count).map(student => student.matricule);
	}
	return buildImportStudents(snapshot, count).map(student => student.matricule);
}

export function classNames(snapshot: SchoolImportSnapshot): string[] {
	return requireClasses(snapshot).map(entry => entry.name);
}

export function pickClasses(snapshot: SchoolImportSnapshot, count: number): SchoolClass[] {
	const classes = requireClasses(snapshot);
	return classes.slice(0, Math.min(count, classes.length));
}

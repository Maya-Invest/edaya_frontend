/**
 * Lecture PGlite locale (copie du data dir pour éviter le lock de `bun repo dev`).
 * Run depuis edaya_web — résout `../edaya_backend/.data/school`.
 */
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sharedDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(sharedDir, '../../../../../edaya_backend');
const schoolDataDir = join(backendRoot, '.data/school');

export type SchoolGradeLevel = {
	id: string;
	name: string;
	/** Stem the school uses for its class names (`6ème` → `6ème 1`). */
	label: string;
	cycle: string;
	orderVal: number;
};

export type SchoolClass = {
	name: string;
	niveau: string;
	capacity: number | null;
};

export type SchoolSubjectAtLevel = {
	niveau: string;
	matiere: string;
	code: string | null;
	coefficient: number | null;
};

export type SchoolClassSubjectOffering = {
	classe: string;
	matiere: string;
};

export type SchoolStudent = {
	matricule: string;
	prenom: string;
	nom: string;
	classe: string | null;
	dateNaissance: string | null;
	genre: string | null;
};

export type SchoolTeacher = {
	code: string;
	prenom: string;
	nom: string;
	email: string | null;
	telephone: string | null;
};

export type SchoolFee = {
	name: string;
	defaultAmount: number;
};

export type SchoolChapter = {
	niveau: string;
	matiere: string;
	titre: string;
	ordre: number;
	description: string;
};

export type SchoolImportSnapshot = {
	gradeLevels: SchoolGradeLevel[];
	classes: SchoolClass[];
	subjectsAtLevel: SchoolSubjectAtLevel[];
	classSubjectOfferings: SchoolClassSubjectOffering[];
	students: SchoolStudent[];
	teachers: SchoolTeacher[];
	fees: SchoolFee[];
	chapters: SchoolChapter[];
};

/** Anchors ordered from the most hoisted to the package that always depends on PGlite. */
const PGLITE_ANCHORS = [
	'package.json',
	'package/adaptor-postgres/package.json',
	'apps/api/package.json',
];

function requirePglite() {
	for (const anchor of PGLITE_ANCHORS) {
		const require = createRequire(join(backendRoot, anchor));
		try {
			return require('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
		}
		catch {
			continue;
		}
	}
	throw new Error(
		`Could not resolve @electric-sql/pglite from ${backendRoot} — run bun install in edaya_backend.`,
	);
}

export async function loadSchoolImportSnapshot(): Promise<SchoolImportSnapshot> {
	if (!existsSync(schoolDataDir)) {
		throw new Error(
			`School PGlite data not found at ${schoolDataDir}. Start the API once (bun repo dev) or seed the local DB.`,
		);
	}

	const { PGlite } = requirePglite();
	const copyDir = mkdtempSync(join(tmpdir(), 'edaya-school-fixtures-'));
	cpSync(schoolDataDir, copyDir, { recursive: true });
	const db = new PGlite(copyDir);

	try {
		const gradeLevels = (await db.query<{
			id: string;
			name: string;
			label: string;
			cycle: string;
			order_val: number;
		}>(`
			SELECT id, name, label, cycle, order_val
			FROM grade_levels
			ORDER BY cycle, order_val, name
		`)).rows.map(row => ({
			id: row.id,
			name: row.name,
			label: row.label,
			cycle: row.cycle,
			orderVal: row.order_val,
		}));

		const classes = (await db.query<{
			name: string;
			niveau: string;
			capacity: number | null;
		}>(`
			SELECT cg.name, gl.name AS niveau, cg.capacity
			FROM class_groups cg
			JOIN grade_levels gl ON gl.id = cg.grade_level_id
			ORDER BY gl.cycle, gl.order_val, gl.name, cg.name
		`)).rows;

		const subjectsAtLevel = (await db.query<{
			niveau: string;
			matiere: string;
			code: string | null;
			coefficient: number | null;
		}>(`
			SELECT gl.name AS niveau, s.name AS matiere, s.code, gls.coefficient
			FROM grade_level_subjects gls
			JOIN grade_levels gl ON gl.id = gls.grade_level_id
			JOIN subjects s ON s.id = gls.subject_id
			ORDER BY gl.cycle, gl.order_val, gl.name, s.name
		`)).rows;

		const classSubjectOfferings = (await db.query<SchoolClassSubjectOffering>(`
			SELECT cg.name AS classe, s.name AS matiere
			FROM class_subjects cs
			JOIN class_groups cg ON cg.id = cs.class_group_id
			JOIN subjects s ON s.id = cs.subject_id
			WHERE cs.is_offered = true
			ORDER BY cg.name, s.name
		`)).rows;

		const students = (await db.query<{
			matricule: string;
			prenom: string;
			nom: string;
			classe: string | null;
			date_naissance: string | null;
			genre: string | null;
		}>(`
			SELECT
				st.matricule,
				st.first_name AS prenom,
				st.last_name AS nom,
				cg.name AS classe,
				CASE
					WHEN st.birth_date IS NULL THEN NULL
					ELSE to_char(st.birth_date::timestamp, 'YYYY-MM-DD')
				END AS date_naissance,
				st.gender AS genre
			FROM students st
			LEFT JOIN LATERAL (
				SELECT sce.class_group_id
				FROM student_class_enrollments sce
				WHERE sce.student_id = st.id
				ORDER BY sce.created_at DESC
				LIMIT 1
			) enrolled ON true
			LEFT JOIN class_groups cg ON cg.id = enrolled.class_group_id
			WHERE st.matricule IS NOT NULL AND btrim(st.matricule) <> ''
			ORDER BY st.matricule
		`)).rows.map(row => ({
			matricule: row.matricule,
			prenom: row.prenom,
			nom: row.nom,
			classe: row.classe,
			dateNaissance: row.date_naissance,
			genre: row.genre,
		}));

		const teachers = (await db.query<{
			code: string;
			prenom: string;
			nom: string;
			email: string | null;
			telephone: string | null;
		}>(`
			SELECT
				code,
				first_name AS prenom,
				last_name AS nom,
				email,
				COALESCE(phone, notification_phone) AS telephone
			FROM teachers
			WHERE code IS NOT NULL AND btrim(code) <> ''
			ORDER BY code
		`)).rows;

		const fees = (await db.query<{ name: string; default_amount: number }>(`
			SELECT name, default_amount
			FROM fees
			ORDER BY name
		`)).rows.map(row => ({
			name: row.name,
			defaultAmount: row.default_amount,
		}));

		const chapters = (await db.query<{
			niveau: string;
			matiere: string;
			titre: string;
			ordre: number;
			description: string | null;
		}>(`
			SELECT
				gl.name AS niveau,
				s.name AS matiere,
				sm.name AS titre,
				sm.sequence_order AS ordre,
				sm.description
			FROM subject_matters sm
			JOIN subjects s ON s.id = sm.subject_id
			JOIN grade_level_subject_matters glsm ON glsm.subject_matter_id = sm.id
			JOIN grade_level_subjects gls ON gls.id = glsm.grade_level_subject_id
			JOIN grade_levels gl ON gl.id = gls.grade_level_id
			ORDER BY gl.cycle, gl.order_val, gl.name, s.name, sm.sequence_order, sm.name
		`)).rows.map(row => ({
			niveau: row.niveau,
			matiere: row.matiere,
			titre: row.titre,
			ordre: row.ordre,
			description: row.description ?? '',
		}));

		return {
			gradeLevels,
			classes,
			subjectsAtLevel,
			classSubjectOfferings,
			students,
			teachers,
			fees,
			chapters,
		};
	}
	finally {
		await db.close();
		rmSync(copyDir, { recursive: true, force: true });
	}
}

export function requireClasses(snapshot: SchoolImportSnapshot): SchoolClass[] {
	if (snapshot.classes.length === 0) {
		throw new Error('No class_groups in local school DB — create classes (onboarding or CL01) before generating fixtures.');
	}
	return snapshot.classes;
}

export function requireGradeLevels(snapshot: SchoolImportSnapshot): SchoolGradeLevel[] {
	if (snapshot.gradeLevels.length === 0) {
		throw new Error('No grade_levels in local school DB.');
	}
	return snapshot.gradeLevels;
}

export function primaryClass(snapshot: SchoolImportSnapshot): SchoolClass {
	return requireClasses(snapshot)[0]!;
}

export function primaryNiveau(snapshot: SchoolImportSnapshot): string {
	return requireGradeLevels(snapshot)[0]!.name;
}

export function secondaryNiveau(snapshot: SchoolImportSnapshot): string {
	const levels = requireGradeLevels(snapshot);
	return (levels[1] ?? levels[0])!.name;
}

/** Retient les `count` premiers candidats absents de la base, sinon échoue explicitement. */
function pickAbsent(
	existing: ReadonlySet<string>,
	candidates: readonly string[],
	count: number,
	kind: string,
): string[] {
	const picked = candidates.filter(candidate => !existing.has(candidate.trim().toLowerCase()));
	if (picked.length < count) {
		throw new Error(
			`Only ${picked.length} of the reserved ${kind} names are absent from the local school DB, ${count} needed.`,
		);
	}
	return picked.slice(0, count);
}

/** Libellés de classe volontairement absents du snapshot (scénarios d’erreur). */
export function unknownClassNames(snapshot: SchoolImportSnapshot, count: number): string[] {
	const existing = new Set(snapshot.classes.map(entry => entry.name.trim().toLowerCase()));
	return pickAbsent(
		existing,
		[`${primaryNiveau(snapshot)} Z`, 'Classe Fantôme QA', 'Classe Inconnue QA', 'Classe Absente QA'],
		count,
		'class',
	);
}

export function unknownClassName(snapshot: SchoolImportSnapshot): string {
	return unknownClassNames(snapshot, 1)[0]!;
}

/** Noms de niveau volontairement absents du snapshot (scénarios d’erreur). */
export function unknownNiveauNames(snapshot: SchoolImportSnapshot, count: number): string[] {
	const existing = new Set(snapshot.gradeLevels.map(level => level.name.trim().toLowerCase()));
	return pickAbsent(
		existing,
		['Niveau Inconnu QA', 'Niveau Fantôme QA', 'Niveau Absent QA', 'Niveau Hors Catalogue QA'],
		count,
		'grade level',
	);
}

export function unknownNiveauName(snapshot: SchoolImportSnapshot): string {
	return unknownNiveauNames(snapshot, 1)[0]!;
}

/** Libellés de matière volontairement absents du snapshot (scénarios d’erreur). */
export function unknownSubjectNames(snapshot: SchoolImportSnapshot, count: number): string[] {
	const existing = new Set([
		...snapshot.subjectsAtLevel.map(entry => entry.matiere.trim().toLowerCase()),
		...snapshot.classSubjectOfferings.map(entry => entry.matiere.trim().toLowerCase()),
	]);
	return pickAbsent(
		existing,
		['Matière Fantôme QA', 'Matière Inconnue QA', 'Matière Absente QA'],
		count,
		'subject',
	);
}

export function unknownSubjectName(snapshot: SchoolImportSnapshot): string {
	return unknownSubjectNames(snapshot, 1)[0]!;
}

export function primaryFeeName(snapshot: SchoolImportSnapshot, fallback: string): string {
	return snapshot.fees[0]?.name ?? fallback;
}

export function feeNames(snapshot: SchoolImportSnapshot, fallback: readonly string[]): string[] {
	if (snapshot.fees.length > 0) {
		return snapshot.fees.map(fee => fee.name);
	}
	return [...fallback];
}

/**
 * Regénère tous les jeux de données Excel QA à partir de la PGlite locale.
 * Run: bun docs/qa/import-fixtures/generate-all-fixtures.ts
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSchoolImportSnapshot } from './_shared/school-db.ts';

const root = dirname(fileURLToPath(import.meta.url));

const snapshot = await loadSchoolImportSnapshot();
console.log('School DB snapshot:');
console.log(`  gradeLevels=${snapshot.gradeLevels.length}`);
console.log(`  classes=${snapshot.classes.length}`);
console.log(`  subjectsAtLevel=${snapshot.subjectsAtLevel.length}`);
console.log(`  classSubjectOfferings=${snapshot.classSubjectOfferings.length}`);
console.log(`  students=${snapshot.students.length}`);
console.log(`  teachers=${snapshot.teachers.length}`);
console.log(`  fees=${snapshot.fees.length}`);
console.log(`  chapters=${snapshot.chapters.length}`);

const packs = [
	'classes/generate-fixtures.ts',
	'students/generate-fixtures.ts',
	'subjects/generate-fixtures.ts',
	'guardians/generate-fixtures.ts',
	'staff/generate-fixtures.ts',
	'teachers/generate-fixtures.ts',
	'teacher-assignments/generate-fixtures.ts',
	'chapters/generate-fixtures.ts',
	'billing/generate-fixtures.ts',
	'payments/generate-fixtures.ts',
];

for (const script of packs) {
	const path = join(root, script);
	console.log(`\n→ ${script}`);
	const result = spawnSync(process.execPath, [path], { stdio: 'inherit', cwd: root });
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

console.log('\nAll import QA fixtures generated from local school DB.');

/**
 * Regénère tous les jeux de données Excel QA (classes, élèves, matières, tuteurs, personnel, enseignants, chapitres, facturation, paiements).
 * Run: bun edaya_web/docs/qa/import-fixtures/generate-all-fixtures.ts
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

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

console.log('\nAll import QA fixtures generated.');

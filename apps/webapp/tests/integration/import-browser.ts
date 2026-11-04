import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';
import { emptyEntities } from '../../scripts/qa-matrix-support';
import { apiFetch } from './setup/journey-api';
import { exerciseImportProgress } from './support/import-progress';
import { exerciseImport, IMPORT_SCENARIOS } from './support/import-workflows';
import { passwordlessApiLogin } from './support/passwordless';

const artifacts = process.env.INTEGRATION_ARTIFACT_DIR ?? '/private/tmp/edaya-import-browser';
mkdirSync(artifacts, { recursive: true });
const base = (process.env.WEBAPP_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
ensurePlaywrightChromium();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.setDefaultTimeout(30_000);
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
try {
	await passwordlessApiLogin(page, base, 'a.kone@ecole-ci.edaya.dev');
	await page.goto(`${base}/dashboard`);
	await page.waitForURL(/\/dashboard/);
	await page.waitForFunction(() => Boolean(document.querySelector('[data-testid="academic-year-trigger"]')?.getAttribute('data-year-id')));
	const year = await page.getByTestId('academic-year-trigger').getAttribute('data-year-id');
	assert(year);
	async function request(path: string, data: unknown) {
		const response = await apiFetch(page, base, `/core/${path}`, { method: 'POST', data, headers: { 'x-actor-kind': 'staff' }, schoolId: 'sch-edaya-ci-cocody', academicYearId: year! });
		assert(response.ok(), `${path}: ${response.status()} ${await response.text()}`);
		return response.json();
	}
	const schoolId = 'sch-edaya-ci-cocody';
	const grades = await request('entities/grade-levels/list', { schoolId }) as { id: string }[];
	const grade = grades.find((item: { id: string }) => item.id.includes('6e')) ?? grades[0];
	assert(grade);
	const classId = crypto.randomUUID();
	await request('commands/create-class-group', { id: classId, schoolId, academicYearId: year, gradeLevelId: grade.id, name: `Import QA ${classId.slice(0, 6)}`, capacity: 100 });
	const offerings = await request('entities/class-subjects/list', { classGroupId: classId }) as { id: string }[];
	assert(offerings.length, 'Import fixture requires configured subjects for the selected grade');
	const entities = { ...emptyEntities(), classId, teachingId: offerings[0].id };
	const types = process.env.EDAYA_IMPORT_PROGRESS_ONLY === 'true' ? ['students'] as const : Object.keys(IMPORT_SCENARIOS) as (keyof typeof IMPORT_SCENARIOS)[];
	for (const type of types) {
		console.log(await exerciseImport(page, base, type, entities));
	}
	await exerciseImportProgress(page, artifacts);
	await page.screenshot({ path: resolve(artifacts, 'import-desktop.png'), fullPage: true });
	await page.setViewportSize({ width: 390, height: 844 });
	await page.screenshot({ path: resolve(artifacts, 'import-mobile.png'), fullPage: true });
	assert.deepEqual(errors, []);
	console.log(`${types.length} import types passed real API/browser save and reload checks; French/English progress, completion, scope and permission checks passed.`);
}
catch (error) {
	await page.screenshot({ path: resolve(artifacts, 'import-failure.png'), fullPage: true }).catch(() => {});
	throw error;
}
finally {
	await browser.close();
}

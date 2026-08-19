#!/usr/bin/env bun
/**
 * Reproduce class setup failure → missing classId → Classes matrix N/A cascade.
 * Run: bunx tsx scripts/repro-class-na-blockers.ts
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { attemptPasswordSignIn } from '../tests/integration/demo-dry-run/support/auth';
import { provisionTenant } from '../tests/integration/support/api-provision';
import {
	clearAcademicSelectionStorage,
	ensureAcademicYearReady,
	fillClassCreateDialog,
	fillGradeLevelCreateDialog,
	openDialogButton,
	refreshAppShell,
	waitForResolvedAcademicYearId,
	submitDialog,
	waitForDialogClosed,
	waitForPageQuery,
} from './qa-harness-ui';
import { QA_TEMPLATE_MATRIX } from './qa-template-matrix';
import {
	emptyEntities,
	resolveEndpoint,
	waitForAppShell,
} from './qa-matrix-support';

const base = process.env.WEBAPP_URL ?? 'http://localhost:5173';
const outDir = path.join(import.meta.dirname, '../.integration-run/repro');

function countClassesNav(entities: ReturnType<typeof emptyEntities>) {
	const classRows = QA_TEMPLATE_MATRIX.filter(r => r.module === 'Classes');
	let resolved = 0;
	let na = 0;
	const samples: Array<{ action: string; endpoint: string; url: string | null }> = [];
	for (const row of classRows) {
		const url = resolveEndpoint(row.endpoint, base, entities);
		if (url) {
			resolved++;
		}
		else {
			na++;
			if (samples.length < 5) {
				samples.push({ action: row.action, endpoint: row.endpoint, url: null });
			}
		}
	}
	return { total: classRows.length, resolved, na, samples };
}

async function runSetupAttempt() {
	const apiCalls: Array<{ url: string; status: number; body: string }> = [];
	const tenant = await provisionTenant();
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();

	page.on('response', async (response) => {
		const url = response.url();
		if (url.includes('/core/commands/')) {
			apiCalls.push({
				url: url.replace(base, ''),
				status: response.status(),
				body: (await response.text().catch(() => '')).slice(0, 400),
			});
		}
	});
	page.on('request', (request) => {
		if (request.url().includes('/core/commands/create-class-group')) {
			apiCalls.push({
				url: '/core/commands/create-class-group (request)',
				status: 0,
				body: request.postData()?.slice(0, 500) ?? '',
			});
		}
	});

	const signedIn = await attemptPasswordSignIn(page, base, tenant.email, tenant.password);
	if (!signedIn) {
		await browser.close();
		return { ok: false, reason: 'login failed', apiCalls };
	}
	await clearAcademicSelectionStorage(page);

	// academic year
	await page.goto(`${base}/configuration/academic`, { waitUntil: 'domcontentloaded' });
	await waitForAppShell(page);
	const yearLabel = `E2E ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
	await openDialogButton(page, /add academic year|ajouter une année scolaire/i);
	await page.getByRole('dialog').locator('input').first().fill(yearLabel);
	await submitDialog(page);
	await waitForDialogClosed(page);
	const yearReady = await ensureAcademicYearReady(page, yearLabel);

	// grade level
	await page.goto(`${base}/configuration/grade-levels`, { waitUntil: 'domcontentloaded' });
	await waitForAppShell(page);
	await waitForPageQuery(page);
	const levelName = `E2E-6eme-${Date.now()}`;
	await openDialogButton(page, /ajouter un niveau|add grade level/i);
	await fillGradeLevelCreateDialog(page, levelName);
	const levelClosed = await waitForDialogClosed(page);
	await refreshAppShell(page, base);
	await waitForResolvedAcademicYearId(page);

	// class
	await page.goto(`${base}/configuration/classes`, { waitUntil: 'domcontentloaded' });
	await waitForAppShell(page);
	await waitForPageQuery(page);
	await openDialogButton(page, /ajouter une classe|add class/i);
	const dialog = page.getByRole('dialog');
	const className = `E2E-6A-${Date.now()}`;

	const beforeClass = {
		yearReady,
		levelClosed,
		sessionYearId: await page.evaluate(() => sessionStorage.getItem('edaya:yearId')),
		selectOptions: await dialog.locator('select').first().locator('option').count(),
		selectValues: await dialog.locator('select').first().locator('option').allTextContents(),
		nameValue: await dialog.locator('input').first().inputValue(),
		academicYearInHeader: await page.getByText(/E2E 20\d\d-/i).first().isVisible().catch(() => false),
	};

	await fillClassCreateDialog(page, className);

	const afterClass = {
		dialogOpen: await dialog.isVisible().catch(() => false),
		toast: await page.locator('[data-sonner-toast], [role="status"]').allTextContents(),
		nameValue: await dialog.locator('input').first().inputValue().catch(() => ''),
		selectedGrade: await dialog.locator('select').first().inputValue().catch(() => ''),
	};

	await browser.close();

	return {
		ok: !afterClass.dialogOpen,
		yearLabel,
		levelName,
		className,
		beforeClass,
		afterClass,
		apiCalls: apiCalls.filter(c => c.url.includes('class') || c.url.includes('grade') || c.url.includes('year') || c.url.includes('publish')),
	};
}

const attempts = 3;
const results = [];
for (let i = 0; i < attempts; i++) {
	results.push(await runSetupAttempt());
}

const empty = emptyEntities();
empty.onboarded = true;
const withClass = { ...empty, classId: 'clsa', configClassId: 'clsa' };

const report = {
	attempts: results,
	classesNavWithoutClassId: countClassesNav(empty),
	classesNavWithClassId: countClassesNav(withClass),
	explanation:
		'When classId is null, resolveEndpoint returns null → qa-matrix-scenarios returns N/A (not NOT OK).',
};

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'class-na-blockers.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

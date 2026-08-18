#!/usr/bin/env bun
/**
 * Reproduce Classes matrix "Contenu principal absent" + create-button false failures.
 * Run: bunx tsx scripts/repro-class-contenu-absent.ts
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Page } from 'playwright';
import { attemptPasswordSignIn } from '../tests/integration/demo-dry-run/support/auth';
import {
	clickCreateButton,
	dismissPageError,
	resolveCreateButtonPatterns,
	waitForPageQuery,
} from './qa-harness-ui';
import {
	assertNoFatalError,
	discoverEntities,
	waitForAppShell,
	type MatrixEntities,
} from './qa-matrix-support';
import type { DemoContext } from '../tests/integration/demo-dry-run/support/types';

const base = process.env.WEBAPP_URL ?? 'http://localhost:5173';
const outDir = path.join(import.meta.dirname, '../.integration-run/repro');

async function loadCreds(): Promise<{ email: string; password: string }> {
	if (process.env.QA_LOGIN_EMAIL && process.env.QA_LOGIN_PASSWORD) {
		return { email: process.env.QA_LOGIN_EMAIL, password: process.env.QA_LOGIN_PASSWORD };
	}
	const raw = await readFile(path.join(import.meta.dirname, '../.integration-run/fixture.json'), 'utf8');
	const fixture = JSON.parse(raw) as { email: string; password: string };
	return { email: fixture.email, password: fixture.password };
}

async function diagPage(page: Page, label: string, url: string, createAction?: string) {
	const consoleErrors: string[] = [];
	const pageErrors: string[] = [];
	const onConsole = (msg: import('playwright').ConsoleMessage) => {
		if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300));
	};
	const onPageError = (err: Error) => pageErrors.push(err.message.slice(0, 300));
	page.on('console', onConsole);
	page.on('pageerror', onPageError);

	const t0 = Date.now();
	await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
	await waitForAppShell(page).catch(() => {});
	await page.waitForTimeout(500);
	await waitForPageQuery(page);
	await dismissPageError(page);
	const fatal = await assertNoFatalError(page);

	const harnessHasMain = await page
		.locator('main, [role="main"], table, [data-testid]')
		.first()
		.isVisible({ timeout: 8_000 })
		.catch(() => false);

	const mains = await page.locator('main, [role="main"]').evaluateAll(els =>
		els.map(el => {
			const r = el.getBoundingClientRect();
			const style = getComputedStyle(el);
			return {
				tag: el.tagName,
				role: el.getAttribute('role'),
				w: Math.round(r.width),
				h: Math.round(r.height),
				visibleCss: style.visibility,
				display: style.display,
				opacity: style.opacity,
				childCount: el.childElementCount,
				textPreview: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
			};
		}),
	);

	const firstMatch = await page.locator('main, [role="main"], table, [data-testid]').evaluateAll(els => {
		const el = els[0];
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return {
			tag: el.tagName,
			testid: el.getAttribute('data-testid'),
			role: el.getAttribute('role'),
			w: Math.round(r.width),
			h: Math.round(r.height),
			hidden: (el as HTMLElement).hidden,
			ariaHidden: el.getAttribute('aria-hidden'),
			className: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
			textPreview: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
		};
	});

	const spinner = await page.locator('[role="status"] .animate-spin').isVisible().catch(() => false);
	const alertText = await page.locator('[role="alert"]').allTextContents().catch(() => []);
	const createPatterns = createAction
		? resolveCreateButtonPatterns(createAction, url)
		: [];
	let createBtnVisible = false;
	let createOpened = false;
	if (createAction) {
		for (const pattern of createPatterns) {
			const btn = page.getByRole('button', { name: pattern }).first();
			if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
				createBtnVisible = true;
				break;
			}
		}
		createOpened = await clickCreateButton(page, createAction, url);
		if (createOpened) {
			await page.keyboard.press('Escape').catch(() => {});
		}
	}

	const bodyText = await page.locator('body').innerText().catch(() => '');
	page.off('console', onConsole);
	page.off('pageerror', onPageError);

	return {
		label,
		url,
		finalUrl: page.url(),
		elapsedMs: Date.now() - t0,
		harnessHasMain,
		fatal,
		spinner,
		mains,
		firstMatch,
		alertText: alertText.map(t => t.slice(0, 160)),
		createPatterns: createPatterns.map(String),
		createBtnVisible,
		createOpened,
		consoleErrors: consoleErrors.slice(0, 8),
		pageErrors: pageErrors.slice(0, 8),
		bodyPreview: bodyText.replace(/\s+/g, ' ').trim().slice(0, 280),
		yearId: await page.evaluate(() => sessionStorage.getItem('edaya:yearId')),
		periodId: await page.evaluate(() => sessionStorage.getItem('edaya:periodId')),
	};
}

const creds = await loadCreds();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const ctx = { page, base } as DemoContext;

const signedIn = await attemptPasswordSignIn(page, base, creds.email, creds.password);
if (!signedIn) {
	throw new Error('login failed');
}
await waitForAppShell(page);

const entities: MatrixEntities = await discoverEntities(ctx);
const classId = entities.classId;
if (!classId) {
	throw new Error(`no classId discovered: ${JSON.stringify(entities)}`);
}

const routes: Array<{ label: string; path: string; createAction?: string; expectPass?: boolean }> = [
	{ label: 'students-list (FAIL in matrix)', path: `/classes/${classId}/students`, createAction: 'Créer élève (scope classe)', expectPass: false },
	{ label: 'evaluations-list (FAIL)', path: `/classes/${classId}/evaluations`, createAction: 'Créer évaluation', expectPass: false },
	{ label: 'timetable (FAIL)', path: `/classes/${classId}/timetable`, expectPass: false },
	{ label: 'teaching (PASS)', path: `/classes/${classId}/teaching`, expectPass: true },
	{ label: 'attendance (PASS)', path: `/classes/${classId}/attendance`, expectPass: true },
	{ label: 'report-cards (PASS)', path: `/classes/${classId}/report-cards`, expectPass: true },
];

if (entities.studentId ?? entities.classStudentId) {
	const sid = entities.classStudentId ?? entities.studentId!;
	routes.push({
		label: 'student-profile (FAIL)',
		path: `/classes/${classId}/students/${sid}/profile`,
		expectPass: false,
	});
}

const pages = [];
for (const route of routes) {
	pages.push(await diagPage(page, route.label, `${base}${route.path}`, route.createAction));
}

const report = {
	generatedAt: new Date().toISOString(),
	entities: {
		classId: entities.classId,
		configClassId: entities.configClassId,
		studentId: entities.studentId,
		classStudentId: entities.classStudentId,
		evaluationId: entities.evaluationId,
		sessionId: entities.sessionId,
	},
	pages,
	hypothesis:
		'Compare harnessHasMain / firstMatch / createBtnVisible between FAIL and PASS class sub-routes. Cascading create failures likely follow blank/non-visible main or scoped button search.',
};

await mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, 'class-contenu-absent.json');
await writeFile(outPath, JSON.stringify(report, null, 2));
await browser.close();
console.log(JSON.stringify(report, null, 2));
console.log(`\nWrote ${outPath}`);

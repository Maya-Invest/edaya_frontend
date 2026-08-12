#!/usr/bin/env bun
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { attemptPasswordSignIn } from '../tests/integration/demo-dry-run/support/auth';
import { provisionTenant } from '../tests/integration/support/api-provision';
import {
	ensureAcademicYearReady,
	openDialogButton,
	submitDialog,
	waitForDialogClosed,
	waitForPageQuery,
} from './qa-harness-ui';
import { waitForAppShell } from './qa-matrix-support';

const base = process.env.WEBAPP_URL ?? 'http://localhost:5173';
const outDir = path.join(import.meta.dirname, '../.integration-run/repro');

const tenant = await provisionTenant();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
const signedIn = await attemptPasswordSignIn(page, base, tenant.email, tenant.password);
if (!signedIn) {
	throw new Error('Login failed');
}
await page.goto(`${base}/configuration/academic`, { waitUntil: 'domcontentloaded' });
await waitForAppShell(page);
await waitForPageQuery(page);

const label = `E2E ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
const opened = await openDialogButton(page, /add academic year|ajouter une année scolaire/i);
if (!opened) {
	throw new Error('Create year button not found');
}

const dialog = page.getByRole('dialog');
await dialog.locator('input').first().waitFor({ state: 'visible', timeout: 30_000 });
await dialog.locator('input').first().fill(label);
await submitDialog(page);
await waitForDialogClosed(page);
await waitForPageQuery(page);
await page.getByRole('heading', { name: label, exact: true }).waitFor({ state: 'visible', timeout: 20_000 });

const section = page.locator('section').filter({ has: page.getByRole('heading', { name: label, exact: true }) }).first();
const before = {
	label,
	url: page.url(),
	sectionText: await section.innerText().catch(() => ''),
	allPageButtons: await page.getByRole('button').allTextContents(),
	publishButtons: await page.getByRole('button', { name: /publish year|publier l/i }).allTextContents(),
};

await mkdir(outDir, { recursive: true });
await page.screenshot({ path: path.join(outDir, 'academic-before-publish.png'), fullPage: true });

const ready = await ensureAcademicYearReady(page, label);
const after = {
	ready,
	sectionText: await section.innerText().catch(() => ''),
	publishButtons: await page.getByRole('button', { name: /publish year|publier l/i }).allTextContents(),
};

await page.screenshot({ path: path.join(outDir, 'academic-after-publish.png'), fullPage: true });
await writeFile(path.join(outDir, 'academic-year-diag.json'), JSON.stringify({ tenant: { email: tenant.email }, before, after }, null, 2));

console.log(JSON.stringify({ before, after }, null, 2));
await browser.close();

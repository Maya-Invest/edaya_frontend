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

async function snapshotYears(page: import('playwright').Page) {
	return page.evaluate(() => {
		const sections = [...document.querySelectorAll('section')];
		return sections.map((section) => {
			const heading = section.querySelector('h3')?.textContent?.trim() ?? '';
			const badges = [...section.querySelectorAll('span.rounded-full')].map(el => el.textContent?.trim() ?? '');
			const buttons = [...section.querySelectorAll('button')].map(el => ({
				text: el.textContent?.replace(/\s+/g, ' ').trim() ?? '',
				disabled: (el as HTMLButtonElement).disabled,
				title: el.getAttribute('title'),
			}));
			const expanded = Boolean(section.querySelector(':scope > div.border-t'));
			return { heading, badges, buttons, expanded, text: section.textContent?.slice(0, 400) };
		}).filter(entry => entry.heading.length > 0);
	});
}

const tenant = await provisionTenant();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const failedCommands: Array<{ url: string; status: number; body: string }> = [];
page.on('response', async (response) => {
	if (!response.url().includes('/core/commands/') || response.request().method() !== 'POST') {
		return;
	}
	if (response.status() < 400) {
		return;
	}
	failedCommands.push({
		url: response.url(),
		status: response.status(),
		body: await response.text().catch(() => ''),
	});
});

await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
const signedIn = await attemptPasswordSignIn(page, base, tenant.email, tenant.password);
if (!signedIn) {
	throw new Error('Login failed');
}
await page.goto(`${base}/configuration/academic`, { waitUntil: 'domcontentloaded' });
await waitForAppShell(page);
await waitForPageQuery(page);

const beforeCreate = await snapshotYears(page);

const label = `E2E ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
const opened = await openDialogButton(page, /add academic year|ajouter une année scolaire/i);
if (!opened) {
	throw new Error('Create year button not found');
}

const dialog = page.getByRole('dialog');
await dialog.locator('input').first().waitFor({ state: 'visible', timeout: 30_000 });
await dialog.locator('input').first().fill(label);
await submitDialog(page);
const dialogClosed = await waitForDialogClosed(page);
await waitForPageQuery(page);
const headingVisible = await page.getByRole('heading', { name: label, exact: true })
	.waitFor({ state: 'visible', timeout: 20_000 })
	.then(() => true)
	.catch(() => false);

const afterCreate = {
	label,
	url: page.url(),
	dialogClosed,
	headingVisible,
	years: await snapshotYears(page),
	allButtons: await page.getByRole('button').allTextContents(),
};

await mkdir(outDir, { recursive: true });
await page.screenshot({ path: path.join(outDir, 'academic-before-publish.png'), fullPage: true });

const ready = await ensureAcademicYearReady(page, label);
const afterPublish = {
	ready,
	url: page.url(),
	years: await snapshotYears(page),
	failedCommands,
	dialogOpen: await page.getByRole('dialog').isVisible().catch(() => false),
	dialogText: await page.getByRole('dialog').innerText().catch(() => ''),
};

await page.screenshot({ path: path.join(outDir, 'academic-after-publish.png'), fullPage: true });
const report = { tenant: { email: tenant.email, schoolId: tenant.schoolId }, beforeCreate, afterCreate, afterPublish };
await writeFile(path.join(outDir, 'academic-year-diag.json'), JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(ready ? 0 : 1);

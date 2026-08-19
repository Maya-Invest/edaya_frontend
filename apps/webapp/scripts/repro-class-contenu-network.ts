#!/usr/bin/env bun
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { attemptPasswordSignIn } from '../tests/integration/demo-dry-run/support/auth';
import { dismissPageError, waitForPageQuery } from './qa-harness-ui';
import { waitForAppShell } from './qa-matrix-support';

const fixture = JSON.parse(
	await readFile(path.join(import.meta.dirname, '../.integration-run/fixture.json'), 'utf8'),
) as { email: string; password: string };
const base = process.env.WEBAPP_URL ?? 'http://localhost:5173';
const classId = 'd3030be7-d938-4663-bfd2-5b4e40755a6c';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const fails: Array<{ status: number; url: string; body: string }> = [];

page.on('response', async (response) => {
	const status = response.status();
	if (status < 400) return;
	const url = response.url();
	if (!url.includes('/core/') && !url.includes('localhost:9999')) return;
	fails.push({
		status,
		url: url.replace(base, '').slice(0, 220),
		body: (await response.text().catch(() => '')).slice(0, 300),
	});
});

await attemptPasswordSignIn(page, base, fixture.email, fixture.password);
await waitForAppShell(page);

// Academic page: how many periods exist?
await page.goto(`${base}/configuration/academic`, { waitUntil: 'domcontentloaded' });
await waitForAppShell(page);
await waitForPageQuery(page);
const academicText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 500);

await page.goto(`${base}/classes/${classId}/students`, { waitUntil: 'domcontentloaded' });
await waitForAppShell(page);
await waitForPageQuery(page);
await dismissPageError(page);
await page.waitForTimeout(2_500);

const html = await page.content();
const report = {
	fails: fails.slice(0, 20),
	hasMainTag: html.includes('<main'),
	mainCount: await page.locator('main').count(),
	alertCount: await page.locator('[role="alert"]').count(),
	alertText: await page.locator('[role="alert"]').allTextContents(),
	storage: await page.evaluate(() => ({
		yearId: sessionStorage.getItem('edaya:yearId'),
		periodId: sessionStorage.getItem('edaya:periodId'),
	})),
	bodyHasUnable: /unable to load|une erreur est survenue/i.test(await page.locator('body').innerText()),
	academicText,
	studentsBody: (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400),
};

const outDir = path.join(import.meta.dirname, '../.integration-run/repro');
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'class-contenu-network.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();

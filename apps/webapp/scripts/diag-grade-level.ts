#!/usr/bin/env bun
import { chromium } from 'playwright';
import { attemptPasswordSignIn } from '../tests/integration/demo-dry-run/support/auth';
import { provisionTenant } from '../tests/integration/support/api-provision';
import {
	ensureAcademicYearReady,
	fillGradeLevelCreateDialog,
	openDialogButton,
	submitDialog,
	waitForDialogClosed,
	waitForPageQuery,
} from './qa-harness-ui';
import { waitForAppShell } from './qa-matrix-support';

const base = process.env.WEBAPP_URL ?? 'http://localhost:5173';
const tenant = await provisionTenant();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const apiCalls: Array<{ url: string; status: number; body: string }> = [];
page.on('response', async (response) => {
	const url = response.url();
	if (url.includes('/core/commands/') || url.includes('configure')) {
		apiCalls.push({
			url,
			status: response.status(),
			body: (await response.text().catch(() => '')).slice(0, 300),
		});
	}
});

const signedIn = await attemptPasswordSignIn(page, base, tenant.email, tenant.password);
if (!signedIn) throw new Error('login failed');

await page.goto(`${base}/configuration/academic`, { waitUntil: 'domcontentloaded' });
await waitForAppShell(page);
const yearLabel = `E2E ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
await openDialogButton(page, /nouvelle année scolaire|new academic year/i);
await page.getByRole('dialog').locator('input').first().fill(yearLabel);
await submitDialog(page);
await waitForDialogClosed(page);
await ensureAcademicYearReady(page, yearLabel);

await page.goto(`${base}/configuration/grade-levels`, { waitUntil: 'domcontentloaded' });
await waitForAppShell(page);
await waitForPageQuery(page);
const levelName = `E2E-6eme-${Date.now()}`;
await openDialogButton(page, /ajouter un niveau|add grade level/i);
await fillGradeLevelCreateDialog(page, levelName);
await page.waitForTimeout(3_000);
const dialog = page.getByRole('dialog');
const after = {
	dialogOpen: await dialog.isVisible().catch(() => false),
	toast: await page.locator('[data-sonner-toast], [role="status"]').allTextContents(),
	apiCalls,
};
console.log(JSON.stringify(after, null, 2));
await browser.close();

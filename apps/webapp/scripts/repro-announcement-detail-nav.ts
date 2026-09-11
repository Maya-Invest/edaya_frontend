/**
 * Isolated Wrangler repro for announcement detail navigation.
 *
 * Requires identity + school API + webapp already running (CI-like: Wrangler :4173).
 *
 *   $env:WEBAPP_URL='http://127.0.0.1:4173'; $env:AUTH_URL='http://127.0.0.1:9900'; $env:API_URL='http://127.0.0.1:9999'
 *   bunx tsx scripts/repro-announcement-detail-nav.ts
 */
import { provisionTenant } from '../tests/integration/support/api-provision';
import { attemptPasswordSignIn } from '../tests/integration/demo-dry-run/support/auth';
import { ensurePlaywrightChromium } from './playwright-browsers';
import {
	clickCreateButton,
	navigateSpaPage,
	openDialogButton,
	trySubmitDialog,
	waitForDialogClosed,
	waitForPageQuery,
} from './qa-harness-ui';
import { firstIdFromLinks, waitForAppShell } from './qa-matrix-support';

const WEBAPP_URL = (process.env.WEBAPP_URL ?? 'http://127.0.0.1:4173').replace(/\/+$/, '');

async function main(): Promise<void> {
	const browsersPath = ensurePlaywrightChromium();
	process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
	const { chromium } = await import('playwright');

	console.log(`Provisioning tenant against identity ${process.env.AUTH_URL ?? 'http://localhost:9900'} and school ${process.env.API_URL ?? 'http://localhost:9999'}`);
	const tenant = await provisionTenant({ appOrigin: WEBAPP_URL });
	console.log(`Login ${tenant.email}`);

	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();
	try {
		const signedIn = await attemptPasswordSignIn(page, WEBAPP_URL, tenant.email, tenant.password);
		if (!signedIn) {
			throw new Error('Login failed');
		}
		await waitForAppShell(page);

		const listUrl = `${WEBAPP_URL}/school/announcements`;
		const listStarted = Date.now();
		await navigateSpaPage(page, listUrl);
		await waitForAppShell(page);
		await waitForPageQuery(page);
		console.log(`list nav ${Date.now() - listStarted}ms url=${page.url()}`);

		let opened = await page.getByRole('dialog').isVisible({ timeout: 3_000 }).catch(() => false);
		if (!opened) {
			opened = await openDialogButton(page, /add announcement|ajouter une annonce/i)
				|| await clickCreateButton(page, 'Créer annonce', '/school/announcements');
		}
		if (!opened) {
			throw new Error('Create announcement modal not found');
		}

		const title = `E2E-Ann-repro-${Date.now()}`;
		const dialog = page.getByRole('dialog');
		await dialog.locator('input').first().fill(title);
		const textarea = dialog.locator('textarea').first();
		if (await textarea.isVisible().catch(() => false)) {
			await textarea.fill('Isolated announcement detail nav repro');
		}
		const createResponse = page.waitForResponse(
			(response) => response.request().method() === 'POST'
				&& response.url().includes('/core/commands/create-announcement'),
			{ timeout: 20_000 },
		).catch(() => null);
		await trySubmitDialog(page);
		const created = await createResponse;
		await waitForDialogClosed(page);
		await waitForPageQuery(page);

		let announcementId: string | null = null;
		const postData = created?.request().postData();
		if (postData) {
			try {
				const body = JSON.parse(postData) as { id?: string };
				announcementId = body.id ?? null;
			}
			catch {
				announcementId = null;
			}
		}
		announcementId ??= await firstIdFromLinks(page, /\/school\/announcements\/([^/?]+)/);
		if (!announcementId) {
			throw new Error(
				`Created "${title}" but no announcement id (create status=${created?.status() ?? 'none'})`,
			);
		}
		console.log(`created ${announcementId}`);

		const detailUrl = `${WEBAPP_URL}/school/announcements/${announcementId}`;
		const detailStarted = Date.now();
		await navigateSpaPage(page, detailUrl);
		await waitForAppShell(page);
		await waitForPageQuery(page);
		console.log(`detail nav ${Date.now() - detailStarted}ms url=${page.url()} readyState=${await page.evaluate(() => document.readyState)}`);

		const headingVisible = await page.getByRole('heading', { name: title }).isVisible({ timeout: 10_000 }).catch(() => false);
		const titleVisible = headingVisible
			|| await page.getByText(title).first().isVisible({ timeout: 5_000 }).catch(() => false);
		if (!titleVisible) {
			throw new Error(`Detail shell loaded but title "${title}" not visible`);
		}
		console.log('announcement detail navigation OK');
	}
	finally {
		await browser.close();
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});

import type { Page } from 'playwright';
import assert from 'node:assert/strict';

/** Exercise real transport/state/UI while controlling completion timing on read responses only. */
export async function exerciseImportProgress(page: Page, artifacts: string) {
	const url = page.url();
	for (const language of ['fr', 'en']) {
		let details = 0;
		let polls = 0;
		let completed = false;
		let denied = false;
		let holdStatus: (() => Promise<void>) | undefined;
		const detailPattern = '**/core/imports/detail';
		const statusPattern = '**/core/imports/status';
		await page.route(detailPattern, async (route) => {
			const response = await route.fetch();
			assert(response.ok());
			const body = await response.json();
			details++;
			if (!completed)
				body.batch.state = 'running';
			await route.fulfill({ response, json: body });
		});
		await page.route(statusPattern, async (route) => {
			const response = await route.fetch();
			assert(response.ok());
			const body = await response.json();
			polls++;
			await holdStatus?.();
			if (denied) {
				await route.fulfill({ response, status: 403, json: { code: 'FORBIDDEN' } });
				return;
			}
			if (!completed)
				body.batch.state = 'running';
			await route.fulfill({ response, json: body });
		});
		try {
			await page.evaluate(lang => localStorage.setItem('lang', lang), language);
			await page.setViewportSize(language === 'fr' ? { width: 1440, height: 1000 } : { width: 390, height: 844 });
			await page.goto(url);
			await page.getByTestId('task-step-execution').click();
			await page.locator('[data-testid="import-progress"][data-state="running"]').waitFor();
			const notice = page.getByRole('status').filter({ hasText: language === 'fr' ? 'La progression se met à jour automatiquement' : 'Progress updates automatically' });
			await notice.waitFor();
			const initialReads = details;
			await page.waitForResponse(response => response.url().endsWith('/imports/status'));
			await page.waitForResponse(response => response.url().endsWith('/imports/status'));
			assert(polls >= 2);
			assert.equal(details, initialReads, 'Polling must not fetch full details');
			const refresh = page.getByRole('button', { name: language === 'fr' ? 'Actualiser' : 'Refresh', exact: true });
			await refresh.focus();
			const refreshed = page.waitForResponse(response => response.url().endsWith('/imports/detail'));
			await page.keyboard.press('Enter');
			await refreshed;
			assert.equal(details, initialReads + 1, 'Keyboard refresh reloads the row snapshot');
			await page.screenshot({ path: `${artifacts}/import-progress-${language}.png`, fullPage: true });
			const finalDetail = page.waitForResponse(response => response.url().endsWith('/imports/detail'));
			completed = true;
			await page.locator('[data-testid="import-progress"][data-state="completed"]').waitFor();
			await finalDetail;
			await notice.waitFor({ state: 'hidden' });
			assert.equal(details, initialReads + 2, 'Completion loads final detail once');
			completed = false;
			await page.reload();
			await page.locator('[data-testid="import-progress"][data-state="running"]').waitFor();
			let release!: () => void;
			let entered!: () => void;
			const held = new Promise<void>((resolve) => { release = resolve; });
			const started = new Promise<void>((resolve) => { entered = resolve; });
			holdStatus = async () => { entered(); await held; };
			await started;
			await page.getByRole('button', { name: language === 'fr' ? 'Fermer' : 'Close', exact: true }).last().click();
			const stale = page.waitForResponse(response => response.url().endsWith('/imports/status'));
			release();
			await stale;
			await page.getByTestId('import-progress').waitFor({ state: 'hidden' });
			holdStatus = undefined;
			await page.goto(url);
			await page.locator('[data-testid="import-progress"][data-state="running"]').waitFor();
			denied = true;
			await page.waitForResponse(response => response.url().endsWith('/imports/status') && response.status() === 403);
			await page.getByTestId('import-progress').waitFor({ state: 'hidden' });
		}
		finally {
			await page.unroute(detailPattern);
			await page.unroute(statusPattern);
		}
	}
	await page.goto(url);
}

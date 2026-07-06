import path from 'node:path';
import type { Page } from 'playwright';
import { DEMO_PASSWORD, STAFF_EMAIL } from './constants';
import type { DemoContext, SignInOptions } from './types';

export async function signIn(ctx: DemoContext, account: SignInOptions = {}): Promise<void> {
	const { namePattern = /Jean-Baptiste Aka|Aka/i, email = STAFF_EMAIL } = account;
	const { page, base } = ctx;

	await page.goto(`${base}/login/demo`, { waitUntil: 'domcontentloaded' });
	const demoBtn = page.getByRole('button', { name: namePattern });
	const hasDemoPicker = await demoBtn.waitFor({ timeout: 20_000 }).then(() => true).catch(() => false);
	if (hasDemoPicker) {
		await demoBtn.click();
	}
	else {
		await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' });
		await page.getByRole('textbox').first().fill(email);
		await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
		await page.getByRole('button', { name: /sign in|connexion|continue|continuer/i }).click();
	}
	await page.waitForURL(/\/(dashboard|school|classes)/, { timeout: 30_000 });
	await page.waitForSelector('aside#app-sidebar', { timeout: 20_000 });
}

export async function assertStackReady(base: string): Promise<void> {
	try {
		const res = await fetch(`${base}/login/demo`, { signal: AbortSignal.timeout(5_000) });
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}
	}
	catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		throw new Error(
			`Webapp not ready at ${base} (${detail}). Start bun dev and seed demo-ci before running integration tests.`,
		);
	}
}

export function createShot(page: Page, outDir: string) {
	return async (name: string) => {
		await page.screenshot({
			path: path.join(outDir, `${name}.png`),
			fullPage: true,
		});
	};
}

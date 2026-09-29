import type { Page } from 'playwright';
import { loginSignInPath } from '../support/paths';

export async function runApiUnavailableBanner(page: Page, base: string): Promise<void> {
	await page.route('**/auth/edaya/methods**', route => route.abort());
	await page.route('**/reference**', route => route.abort());
	try {
		await page.goto(loginSignInPath(base), { waitUntil: 'domcontentloaded' });
		await page.getByRole('status').filter({
			hasText: /API locale indisponible|Local API unavailable|API unavailable|API indisponible/i,
		}).waitFor({ state: 'visible', timeout: 20_000 });
	}
	finally {
		await page.unroute('**/auth/edaya/methods**');
		await page.unroute('**/reference**');
	}
}

import type { Browser } from 'playwright';
import { assertAlreadyAcceptedInvite, withIsolatedPage } from '../support/invite';

export async function runInviteAlreadyAccepted(
	browser: Browser,
	base: string,
	token: string,
): Promise<void> {
	await withIsolatedPage(browser, async (page) => {
		await assertAlreadyAcceptedInvite(page, base, token);
	});
}

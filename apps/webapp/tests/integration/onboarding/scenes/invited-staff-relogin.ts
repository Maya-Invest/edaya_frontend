import type { Page } from 'playwright';
import { expectAppDashboard, signInWithPassword } from '../support/auth';

export async function runInvitedStaffRelogin(
	page: Page,
	base: string,
	credentials: { email: string; password: string },
): Promise<void> {
	await signInWithPassword(page, base, credentials.email, credentials.password);
	await expectAppDashboard(page);
	if (page.url().includes('/onboarding')) {
		throw new Error(`Invited staff signed in to onboarding: ${page.url()}`);
	}
}

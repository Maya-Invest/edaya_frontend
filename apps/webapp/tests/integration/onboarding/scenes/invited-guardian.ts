import type { Browser, Page } from 'playwright';
import { uniqueOnboardingEmail, uniqueOnboardingPassword } from '../support/capture';
import { acceptInviteThroughUi, inviteGuardianFromOwnerPage, withIsolatedPage } from '../support/invite';

export async function runInvitedGuardian(
	ownerPage: Page,
	browser: Browser,
	base: string,
): Promise<void> {
	const email = uniqueOnboardingEmail();
	const password = uniqueOnboardingPassword();
	const token = await inviteGuardianFromOwnerPage(ownerPage, base, email);

	await withIsolatedPage(browser, async (page) => {
		await acceptInviteThroughUi(page, base, {
			token,
			name: 'Invited Guardian',
			email,
			password,
			kind: 'guardian',
			verifyInNewPage: true,
		});
	});
}

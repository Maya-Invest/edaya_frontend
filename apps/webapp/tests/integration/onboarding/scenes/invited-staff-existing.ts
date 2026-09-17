import type { Browser, Page } from 'playwright';
import { uniqueOnboardingEmail, uniqueOnboardingPassword } from '../support/capture';
import { signOutFromOnboarding, signUpThroughUi } from '../support/auth';
import { acceptInviteThroughUi, inviteStaffFromOwnerPage, withIsolatedPage } from '../support/invite';

export async function runInvitedStaffExisting(
	ownerPage: Page,
	browser: Browser,
	base: string,
): Promise<void> {
	const email = uniqueOnboardingEmail();
	const password = uniqueOnboardingPassword();
	await withIsolatedPage(browser, async (page) => {
		await signUpThroughUi(page, base, {
			name: 'Existing Staff',
			email,
			password,
		});
		await signOutFromOnboarding(page);
	});

	const token = await inviteStaffFromOwnerPage(ownerPage, base, email);

	await withIsolatedPage(browser, async (page) => {
		await acceptInviteThroughUi(page, base, {
			token,
			name: 'Existing Staff',
			email,
			password,
			kind: 'staff',
			mode: 'signIn',
		});
	});
}

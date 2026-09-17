import type { Browser, Page } from 'playwright';
import { acceptStaffInviteThroughUi, inviteStaffFromOwnerPage, withIsolatedPage } from '../support/invite';
import { uniqueOnboardingEmail, uniqueOnboardingPassword } from '../support/capture';

export async function runInvitedStaff(
	ownerPage: Page,
	browser: Browser,
	base: string,
): Promise<string> {
	const email = uniqueOnboardingEmail();
	const password = uniqueOnboardingPassword();
	const token = await inviteStaffFromOwnerPage(ownerPage, base, email);

	await withIsolatedPage(browser, async (page) => {
		await acceptStaffInviteThroughUi(page, base, {
			token,
			name: 'Invited Staff',
			email,
			password,
		});
	});

	return token;
}

import type { Browser, Page } from 'playwright';
import { acceptStaffInviteThroughUi, inviteStaffFromOwnerPage, withIsolatedPage } from '../support/invite';
import { uniqueOnboardingEmail, uniqueOnboardingPassword } from '../support/capture';

export interface InvitedStaffCredentials {
	token: string;
	email: string;
	password: string;
}

export async function runInvitedStaff(
	ownerPage: Page,
	browser: Browser,
	base: string,
): Promise<InvitedStaffCredentials> {
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

	return { token, email, password };
}

import type { Browser, Page } from 'playwright';
import { acceptStaffInviteThroughUi, inviteStaffFromOwnerPage } from '../support/invite';
import { uniqueOnboardingEmail, uniqueOnboardingPassword } from '../support/capture';

export async function runInvitedStaff(
	ownerPage: Page,
	browser: Browser,
	base: string,
): Promise<void> {
	const email = uniqueOnboardingEmail();
	const password = uniqueOnboardingPassword();
	const token = await inviteStaffFromOwnerPage(ownerPage, base, email);

	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	try {
		await acceptStaffInviteThroughUi(page, base, {
			token,
			name: 'Invited Staff',
			email,
			password,
		});
	}
	finally {
		await context.close();
	}
}

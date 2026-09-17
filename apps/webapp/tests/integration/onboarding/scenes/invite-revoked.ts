import type { Browser, Page } from 'playwright';
import { uniqueOnboardingEmail } from '../support/capture';
import {
	assertRevokedInvite,
	inviteStaffFromOwnerPage,
	resendInvitationFromProfile,
	withIsolatedPage,
} from '../support/invite';

export async function runInviteRevoked(
	ownerPage: Page,
	browser: Browser,
	base: string,
): Promise<void> {
	const originalToken = await inviteStaffFromOwnerPage(ownerPage, base, uniqueOnboardingEmail());
	const { token } = await resendInvitationFromProfile(ownerPage);
	if (!token || token === originalToken) {
		throw new Error('Resend did not replace the previous invitation token');
	}

	await withIsolatedPage(browser, async (page) => {
		await assertRevokedInvite(page, base, originalToken);
	});
}

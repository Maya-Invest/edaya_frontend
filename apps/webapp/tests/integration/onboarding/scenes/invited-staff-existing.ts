import type { Browser, Page } from 'playwright';
import { signUpAccount } from '../../support/api-provision';
import { resolveApiUrl } from '../../support/integration-hosts';
import { uniqueOnboardingEmail, uniqueOnboardingPassword } from '../support/capture';
import { acceptInviteThroughUi, inviteStaffFromOwnerPage, withIsolatedPage } from '../support/invite';

export async function runInvitedStaffExisting(
	ownerPage: Page,
	browser: Browser,
	base: string,
): Promise<void> {
	const email = uniqueOnboardingEmail();
	const password = uniqueOnboardingPassword();
	await signUpAccount(resolveApiUrl(), base, email, password, 'Existing Staff');
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

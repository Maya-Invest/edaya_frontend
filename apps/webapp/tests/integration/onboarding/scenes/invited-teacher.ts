import type { Browser, Page } from 'playwright';
import { uniqueOnboardingEmail, uniqueOnboardingPassword } from '../support/capture';
import { acceptInviteThroughUi, inviteTeacherFromOwnerPage, withIsolatedPage } from '../support/invite';

export async function runInvitedTeacher(
	ownerPage: Page,
	browser: Browser,
	base: string,
): Promise<void> {
	const email = uniqueOnboardingEmail();
	const password = uniqueOnboardingPassword();
	const token = await inviteTeacherFromOwnerPage(ownerPage, base, email);

	await withIsolatedPage(browser, async (page) => {
		await acceptInviteThroughUi(page, base, {
			token,
			name: 'Invited Teacher',
			email,
			password,
			kind: 'teacher',
			verifyInNewPage: true,
		});
	});
}

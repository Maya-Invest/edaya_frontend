import type { Page } from 'playwright';
import { uniqueOnboardingEmail } from '../support/capture';
import { assertWrongAccountInvite, inviteStaffFromOwnerPage } from '../support/invite';

export async function runInviteWrongAccount(ownerPage: Page, base: string): Promise<void> {
	const token = await inviteStaffFromOwnerPage(ownerPage, base, uniqueOnboardingEmail());
	await assertWrongAccountInvite(ownerPage, base, token);
}

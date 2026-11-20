import type { Page } from 'playwright';
import { assertExpiredInvitePage } from '../support/invite';

export async function runInviteExpired(page: Page, base: string): Promise<void> {
	await assertExpiredInvitePage(page, base);
}

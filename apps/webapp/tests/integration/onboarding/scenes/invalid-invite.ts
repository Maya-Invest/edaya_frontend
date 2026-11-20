import type { Page } from 'playwright';
import { assertInvalidInvitePage } from '../support/invite';

export async function runInvalidInvite(page: Page, base: string): Promise<void> {
	await assertInvalidInvitePage(page, base);
}

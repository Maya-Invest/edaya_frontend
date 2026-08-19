import type { ResolvedPathname } from '$app/types';
import { describe, expect, it } from 'bun:test';
import {
	ACCOUNT_PROFILE_MODAL,
	accountHrefWithReturn,
} from '$lib/account/profile-url';
import { appendModal } from '$lib/modal/modal-url';

describe('account profile navigation', () => {
	it('uses the standardized modal query surface', () => {
		expect(String(appendModal('/dashboard', ACCOUNT_PROFILE_MODAL))).toBe(
			'/dashboard?modal=account-profile',
		);
	});

	it('marks account shortcuts for return to the profile modal', () => {
		expect(accountHrefWithReturn('/account/inbox' as ResolvedPathname)).toBe(
			'/account/inbox?return=profile',
		);
	});
});

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
	clearPendingInviteToken,
	pendingInvitePath,
	persistPendingInviteToken,
	readPendingInviteToken,
} from '$lib/auth/pending-invite-token';

function mockSessionStorage() {
	const store = new Map<string, string>();
	Object.defineProperty(globalThis, 'sessionStorage', {
		configurable: true,
		value: {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, value);
			},
			removeItem: (key: string) => {
				store.delete(key);
			},
		},
	});
}

describe('pending invite token storage', () => {
	beforeEach(() => {
		mockSessionStorage();
	});

	afterEach(() => {
		Reflect.deleteProperty(globalThis, 'sessionStorage');
	});

	it('persists and reads invite tokens', () => {
		persistPendingInviteToken('abc123');
		expect(readPendingInviteToken()).toBe('abc123');
		clearPendingInviteToken();
		expect(readPendingInviteToken()).toBeNull();
	});

	it('builds invite paths from storage', () => {
		persistPendingInviteToken('token/with/slash');
		expect(pendingInvitePath()).toBe('/invite/token%2Fwith%2Fslash');
	});
});

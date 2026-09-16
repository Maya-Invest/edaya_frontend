import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
	clearPendingInviteToken,
	pendingInvitePath,
	persistPendingInviteToken,
	readPendingInviteToken,
} from '$lib/auth/pending-invite-token';

function mockWebStorage() {
	function createStore() {
		const store = new Map<string, string>();
		return {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, value);
			},
			removeItem: (key: string) => {
				store.delete(key);
			},
		};
	}

	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		value: createStore(),
	});
	Object.defineProperty(globalThis, 'sessionStorage', {
		configurable: true,
		value: createStore(),
	});
}

describe('pending invite token storage', () => {
	beforeEach(() => {
		mockWebStorage();
	});

	afterEach(() => {
		Reflect.deleteProperty(globalThis, 'localStorage');
		Reflect.deleteProperty(globalThis, 'sessionStorage');
	});

	it('persists invite tokens across a new tab via localStorage', () => {
		persistPendingInviteToken('abc123');
		expect(readPendingInviteToken()).toBe('abc123');
		expect(globalThis.localStorage.getItem('edaya:pending-invite-token')).toBe('abc123');
		clearPendingInviteToken();
		expect(readPendingInviteToken()).toBeNull();
	});

	it('reads a token left only in sessionStorage', () => {
		globalThis.sessionStorage.setItem('edaya:pending-invite-token', 'legacy-token');
		expect(readPendingInviteToken()).toBe('legacy-token');
	});

	it('builds invite paths from storage', () => {
		persistPendingInviteToken('token/with/slash');
		expect(pendingInvitePath()).toBe('/invite/token%2Fwith%2Fslash');
	});
});

import { clearAuthGate, hasAuthGatePassed, markAuthGatePassed } from '$lib/auth/auth-gate';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

function mockSessionStorage() {
	const store = new Map<string, string>();
	const sessionStorage = {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => {
			store.set(key, value);
		},
		removeItem: (key: string) => {
			store.delete(key);
		},
	};

	Object.defineProperty(globalThis, 'sessionStorage', {
		configurable: true,
		value: sessionStorage,
	});
}

describe('auth-gate', () => {
	beforeEach(() => {
		mockSessionStorage();
		clearAuthGate();
	});

	afterEach(() => {
		clearAuthGate();
	});

	it('starts closed and opens after explicit sign-in', () => {
		expect(hasAuthGatePassed()).toBe(false);
		markAuthGatePassed();
		expect(hasAuthGatePassed()).toBe(true);
	});

	it('clears on logout', () => {
		markAuthGatePassed();
		clearAuthGate();
		expect(hasAuthGatePassed()).toBe(false);
	});
});

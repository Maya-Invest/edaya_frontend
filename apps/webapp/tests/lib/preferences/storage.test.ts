import { afterEach, describe, expect, test } from 'bun:test';
import { readPreference, writePreference } from '../../../src/lib/preferences/storage';

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
	if (original)
		Object.defineProperty(globalThis, 'localStorage', original);
	else Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('non-secret preferences', () => {
	test('blocked storage getters do not break initialization or edits', () => {
		Object.defineProperty(globalThis, 'localStorage', {
			configurable: true,
			get() {
				throw new Error('denied');
			},
		});
		expect(readPreference('local', 'blocked')).toBeNull();
		writePreference('local', 'blocked', 'fr');
		expect(readPreference('local', 'blocked')).toBe('fr');
		writePreference('local', 'blocked', null);
		expect(readPreference('local', 'blocked')).toBeNull();
	});
	test('fallback isolates storage kinds and keys and recovers on a later successful write', () => {
		Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: undefined });
		writePreference('local', 'account-a', 'a');
		writePreference('session', 'account-b', 'b');
		expect(readPreference('local', 'account-b')).toBeNull();
		expect(readPreference('session', 'account-b')).toBe('b');
		const values = new Map<string, string>();
		Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => values.set(key, value),
			removeItem: (key: string) => values.delete(key),
		} });
		writePreference('local', 'account-a', 'new');
		expect(values.get('account-a')).toBe('new');
		values.set('account-a', 'external');
		expect(readPreference('local', 'account-a')).toBe('external');
	});
});

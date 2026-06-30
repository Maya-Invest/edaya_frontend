import { describe, expect, it } from 'bun:test';
import {
	createEmptyDraft,
	draftStorageKey,
	loadDraft,
	saveDraft,
} from './draft-storage';

describe('draft-storage', () => {
	it('round-trips draft data through sessionStorage', () => {
		const storage = new Map<string, string>();
		const sessionStorageMock = {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => {
				storage.set(key, value);
			},
			removeItem: (key: string) => {
				storage.delete(key);
			},
		};

		const original = globalThis.sessionStorage;
		Object.defineProperty(globalThis, 'sessionStorage', {
			value: sessionStorageMock,
			configurable: true,
		});

		try {
			const authUserId = 'user-123';
			const draft = createEmptyDraft();
			draft.school.name = 'Collège Test';
			draft.maxReachedStep = 2;

			saveDraft(authUserId, draft);
			const loaded = loadDraft(authUserId);

			expect(loaded?.school.name).toBe('Collège Test');
			expect(loaded?.maxReachedStep).toBe(2);
			expect(storage.has(draftStorageKey(authUserId))).toBe(true);
		}
		finally {
			Object.defineProperty(globalThis, 'sessionStorage', {
				value: original,
				configurable: true,
			});
		}
	});

	it('returns null for invalid stored payloads', () => {
		const storage = new Map<string, string>([
			[draftStorageKey('user-123'), JSON.stringify({ version: 99 })],
		]);
		const sessionStorageMock = {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: () => {},
			removeItem: () => {},
		};

		const original = globalThis.sessionStorage;
		Object.defineProperty(globalThis, 'sessionStorage', {
			value: sessionStorageMock,
			configurable: true,
		});

		try {
			expect(loadDraft('user-123')).toBeNull();
		}
		finally {
			Object.defineProperty(globalThis, 'sessionStorage', {
				value: original,
				configurable: true,
			});
		}
	});
});

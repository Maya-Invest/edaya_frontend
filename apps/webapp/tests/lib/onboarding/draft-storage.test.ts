import { describe, expect, it } from 'bun:test';
import {
	createEmptyDraft,
	draftStorageKey,
	loadDraft,
	saveDraft,
} from '$lib/onboarding/draft-storage';

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
			expect(draft.school.country).toBe("Côte d'Ivoire");
			expect(draft.school.timezone).toBe('Africa/Abidjan');
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

	it('migrates legacy gl-* gradeLevelIds to API fixture ids', () => {
		const storage = new Map<string, string>([
			[draftStorageKey('user-legacy'), JSON.stringify({
				version: 3,
				updatedAt: '2026-01-01T00:00:00.000Z',
				maxReachedStep: 2,
				wizardCompleted: false,
				schoolStepSubmitted: true,
				structureStepSubmitted: false,
				staffStepSubmitted: false,
				registeredSchoolId: null,
				school: {
					name: 'Lycée Test',
					city: 'Abidjan',
					country: "Côte d'Ivoire",
					timezone: 'Africa/Abidjan',
					academicYearLabel: '2025 — 2026',
					academicYearStart: '2025-09-01',
					academicYearEnd: '2026-07-03',
					periodType: 'trimester',
					periods: [],
				},
				structure: {
					models: ['lycee'],
					levels: [
						{ gradeLevelId: 'gl-1', classCount: 2, capacity: 30 },
						{ gradeLevelId: 'gl-t', classCount: 0, capacity: 30 },
					],
				},
				staffInvites: [],
			})],
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
			const loaded = loadDraft('user-legacy');
			expect(loaded?.version).toBe(4);
			expect(loaded?.structure.levels).toEqual([
				{ gradeLevelId: 'ci-lycee:1ERC', classCount: 2, capacity: 30 },
				{ gradeLevelId: 'ci-lycee:TLEC', classCount: 0, capacity: 30 },
			]);
		}
		finally {
			Object.defineProperty(globalThis, 'sessionStorage', {
				value: original,
				configurable: true,
			});
		}
	});

	it('resets non structure-ready countries to Côte d\'Ivoire on load', () => {
		const storage = new Map<string, string>([
			[draftStorageKey('user-fr'), JSON.stringify({
				version: 4,
				updatedAt: '2026-01-01T00:00:00.000Z',
				maxReachedStep: 1,
				wizardCompleted: false,
				schoolStepSubmitted: false,
				structureStepSubmitted: false,
				staffStepSubmitted: false,
				registeredSchoolId: null,
				school: {
					name: 'Collège FR',
					city: 'Paris',
					country: 'France',
					timezone: 'Europe/Paris',
					academicYearLabel: '2025 — 2026',
					academicYearStart: '2025-09-01',
					academicYearEnd: '2026-07-03',
					periodType: 'trimester',
					periods: [],
				},
				structure: { models: [], levels: [] },
				staffInvites: [],
			})],
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
			const loaded = loadDraft('user-fr');
			expect(loaded?.school.country).toBe("Côte d'Ivoire");
			expect(loaded?.school.timezone).toBe('Africa/Abidjan');
		}
		finally {
			Object.defineProperty(globalThis, 'sessionStorage', {
				value: original,
				configurable: true,
			});
		}
	});
});

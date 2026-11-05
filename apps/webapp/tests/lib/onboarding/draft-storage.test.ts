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
			expect(draft.school.shortName).toBe('');
			draft.school.name = 'Collège Test';
			draft.school.shortName = 'CT École';
			draft.ownerIdentifier = 'OWNER-001';
			draft.staffInvites = [{ id: 'invite', identifier: 'STAFF-002', email: 'staff@example.test', role: 'secretary' }];
			draft.maxReachedStep = 2;

			saveDraft(authUserId, draft);
			const loaded = loadDraft(authUserId);

			expect(loaded?.school.name).toBe('Collège Test');
			expect(loaded?.school.shortName).toBe('CT École');
			expect(loaded?.ownerIdentifier).toBe('OWNER-001');
			expect(loaded?.staffInvites[0]?.identifier).toBe('STAFF-002');
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
			expect(loaded?.version).toBe(8);
			expect(loaded?.structure.levels).toEqual([
				{ gradeLevelId: 'ci-lycee:1ERC', classCount: 2, capacity: 30, classNamingMode: 'numerical' },
				{ gradeLevelId: 'ci-lycee:TLEC', classCount: 0, capacity: 30, classNamingMode: 'numerical' },
			]);
		}
		finally {
			Object.defineProperty(globalThis, 'sessionStorage', {
				value: original,
				configurable: true,
			});
		}
	});

 it('migrates a v7 review draft without requiring obsolete mappings', () => {
  const draft = createEmptyDraft();
  const legacy = {...draft, version: 7, maxReachedStep: 4, structureStepSubmitted: true,
   structure: {models: ['college'], disciplineMappings: [], levels: [{gradeLevelId: 'ci-college:6EME', classCount: 2, capacity: 35, classNamingMode: 'alphabetical' as const}]}};
  const original = globalThis.sessionStorage;
  Object.defineProperty(globalThis, 'sessionStorage', {configurable: true, value: {getItem: () => JSON.stringify(legacy)}});
  try {
   const loaded = loadDraft('legacy-user')!;
   expect(loaded.version).toBe(8);
   expect(loaded.maxReachedStep).toBe(4);
   expect(loaded.structureStepSubmitted).toBe(true);
   expect(loaded.structure).toEqual({dataset: {id: 'ci-general-secondary', version: '1.0.0'}, templates: ['ci-college'], levels: legacy.structure.levels});
  } finally { Object.defineProperty(globalThis, 'sessionStorage', {configurable: true, value: original}); }
 });

	it('preserves unsupported countries without substituting another country', () => {
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
			expect(loaded?.school.country).toBe("France");
			expect(loaded?.school.timezone).toBe('Europe/Paris');
		}
		finally {
			Object.defineProperty(globalThis, 'sessionStorage', {
				value: original,
				configurable: true,
			});
		}
	});

	it('replaces a free-text academic year label with years from the dates', () => {
		const storage = new Map<string, string>([
			[draftStorageKey('user-label'), JSON.stringify({
				version: 7,
				updatedAt: '2026-01-01T00:00:00.000Z',
				maxReachedStep: 1,
				wizardCompleted: false,
				schoolStepSubmitted: false,
				structureStepSubmitted: false,
				staffStepSubmitted: false,
				registeredSchoolId: null,
				school: {
					name: 'Collège Test',
					city: 'Abidjan',
					country: "Côte d'Ivoire",
					timezone: 'Africa/Abidjan',
					academicYearLabel: 'anneeteny',
					academicYearStart: '2026-09-01',
					academicYearEnd: '2027-07-03',
					periodType: 'trimester',
					periods: [{
						id: 'p1',
						label: 'Trimestre 1',
						start: '2026-09-01',
						end: '2026-12-19',
					}],
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
			const loaded = loadDraft('user-label');
			expect(loaded?.school.academicYearLabel).toBe('2026-2027');
			expect(loaded?.school.academicYearStart).toBe('2026-09-01');
			expect(loaded?.school.academicYearEnd).toBe('2027-07-03');
		}
		finally {
			Object.defineProperty(globalThis, 'sessionStorage', {
				value: original,
				configurable: true,
			});
		}
	});

	it('loads a draft from localStorage when sessionStorage is empty', () => {
		const local = new Map<string, string>();
		const session = new Map<string, string>();
		const sessionStorageMock = {
			getItem: (key: string) => session.get(key) ?? null,
			setItem: (key: string, value: string) => {
				session.set(key, value);
			},
			removeItem: (key: string) => {
				session.delete(key);
			},
		};
		const localStorageMock = {
			getItem: (key: string) => local.get(key) ?? null,
			setItem: (key: string, value: string) => {
				local.set(key, value);
			},
			removeItem: (key: string) => {
				local.delete(key);
			},
		};

		const originalSession = globalThis.sessionStorage;
		const originalLocal = globalThis.localStorage;
		Object.defineProperty(globalThis, 'sessionStorage', {
			value: sessionStorageMock,
			configurable: true,
		});
		Object.defineProperty(globalThis, 'localStorage', {
			value: localStorageMock,
			configurable: true,
		});

		try {
			const authUserId = 'user-local';
			const draft = createEmptyDraft();
			draft.school.name = 'Collège Local';
			draft.maxReachedStep = 2;
			saveDraft(authUserId, draft);
			session.clear();
			const loaded = loadDraft(authUserId);
			expect(loaded?.school.name).toBe('Collège Local');
			expect(loaded?.maxReachedStep).toBe(2);
		}
		finally {
			Object.defineProperty(globalThis, 'sessionStorage', {
				value: originalSession,
				configurable: true,
			});
			Object.defineProperty(globalThis, 'localStorage', {
				value: originalLocal,
				configurable: true,
			});
		}
	});
});

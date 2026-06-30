import { describe, expect, it } from 'bun:test';
import { createEmptyDraft, saveDraft } from './draft-storage';
import {
	onboardingResumePath,
	shouldContinueOnboarding,
} from './resume-onboarding';

function withSessionStorage<T>(run: () => T): T {
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
		return run();
	}
	finally {
		Object.defineProperty(globalThis, 'sessionStorage', {
			value: original,
			configurable: true,
		});
	}
}

describe('resume onboarding', () => {
	it('resumes linked users when the wizard is not completed', () => {
		withSessionStorage(() => {
			const authUserId = 'user-resume-1';
			const draft = createEmptyDraft();
			draft.schoolStepSubmitted = true;
			draft.maxReachedStep = 2;
			saveDraft(authUserId, draft);

			expect(shouldContinueOnboarding(authUserId, 'sch-1')).toBe(true);
			expect(onboardingResumePath(authUserId, 'sch-1')).toBe('/onboarding?step=2');
		});
	});

	it('does not resume after wizard completion', () => {
		withSessionStorage(() => {
			const authUserId = 'user-resume-2';
			const draft = createEmptyDraft();
			draft.wizardCompleted = true;
			saveDraft(authUserId, draft);

			expect(shouldContinueOnboarding(authUserId, 'sch-1')).toBe(false);
			expect(onboardingResumePath(authUserId, 'sch-1')).toBeNull();
		});
	});

	it('resumes at step 1 for linked users without a stored draft', () => {
		withSessionStorage(() => {
			expect(shouldContinueOnboarding('user-no-draft', 'sch-1')).toBe(true);
			expect(onboardingResumePath('user-no-draft', 'sch-1')).toBe('/onboarding?step=1');
		});
	});
});

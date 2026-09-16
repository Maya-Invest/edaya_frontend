import { describe, expect, it } from 'bun:test';
import { createEmptyDraft, saveDraft } from '$lib/onboarding/draft-storage';
import {
	mergeOnboardingDraftWithServerStatus,
	onboardingResumePath,
	persistServerOnboardingStatusToDraft,
	shouldContinueOnboarding,
	shouldHoldOnboardingSummary,
} from '$lib/onboarding/resume-onboarding';

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
	it('does not send invited staff into the owner wizard', () => {
		withSessionStorage(() => {
			const authUserId = 'user-invited-staff';
			const draft = createEmptyDraft();
			draft.schoolStepSubmitted = true;
			draft.maxReachedStep = 2;
			saveDraft(authUserId, draft);

			expect(shouldContinueOnboarding(authUserId, 'sch-1')).toBe(false);
			expect(onboardingResumePath(authUserId, 'sch-1')).toBeNull();

			const serverStatus = {
				wizardCompleted: true,
				maxReachedStep: 4 as const,
				schoolStepSubmitted: true,
				structureStepSubmitted: true,
			};
			expect(shouldContinueOnboarding(authUserId, 'sch-1', serverStatus)).toBe(false);
			expect(onboardingResumePath(authUserId, 'sch-1', serverStatus)).toBeNull();
		});
	});

	it('resumes unlinked draft progress without a school id', () => {
		withSessionStorage(() => {
			const authUserId = 'user-unlinked-draft';
			const draft = createEmptyDraft();
			draft.schoolStepSubmitted = true;
			draft.maxReachedStep = 2;
			saveDraft(authUserId, draft);

			expect(shouldContinueOnboarding(authUserId)).toBe(true);
			expect(onboardingResumePath(authUserId)).toBe('/onboarding?step=2');
		});
	});

	it('resumes linked users when the wizard is not completed', () => {
		withSessionStorage(() => {
			const authUserId = 'user-resume-1';
			const draft = createEmptyDraft();
			draft.schoolStepSubmitted = true;
			draft.maxReachedStep = 2;
			saveDraft(authUserId, draft);

			const serverStatus = {
				wizardCompleted: false,
				maxReachedStep: 2 as const,
				schoolStepSubmitted: true,
				structureStepSubmitted: false,
			};

			expect(shouldContinueOnboarding(authUserId, 'sch-1', serverStatus)).toBe(true);
			expect(onboardingResumePath(authUserId, 'sch-1', serverStatus)).toBe('/onboarding?step=2');
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

	it('does not resume for school-step stub at step 1 (app shell init artifact)', () => {
		withSessionStorage(() => {
			const authUserId = 'user-stub';
			const draft = createEmptyDraft();
			draft.schoolStepSubmitted = true;
			draft.registeredSchoolId = 'sch-1';
			saveDraft(authUserId, draft);

			expect(shouldContinueOnboarding(authUserId, 'sch-1')).toBe(false);
			expect(onboardingResumePath(authUserId, 'sch-1')).toBeNull();
		});
	});

	it('does not resume linked users without draft or server status (post-wizard cleanup)', () => {
		withSessionStorage(() => {
			expect(shouldContinueOnboarding('user-no-draft', 'sch-1')).toBe(false);
			expect(onboardingResumePath('user-no-draft', 'sch-1')).toBeNull();
		});
	});

	it('uses backend onboarding status when local draft is missing', () => {
		withSessionStorage(() => {
			const serverStatus = {
				wizardCompleted: true,
				maxReachedStep: 4 as const,
				schoolStepSubmitted: true,
				structureStepSubmitted: true,
			};

			expect(shouldContinueOnboarding('user-no-draft', 'sch-1', serverStatus)).toBe(false);
			expect(onboardingResumePath('user-no-draft', 'sch-1', serverStatus)).toBeNull();
		});
	});

	it('resumes at the backend max step when local draft is behind', () => {
		withSessionStorage(() => {
			const authUserId = 'user-server-step';
			const draft = createEmptyDraft();
			draft.schoolStepSubmitted = true;
			draft.maxReachedStep = 2;
			saveDraft(authUserId, draft);

			const serverStatus = {
				wizardCompleted: false,
				maxReachedStep: 4 as const,
				schoolStepSubmitted: true,
				structureStepSubmitted: true,
			};

			expect(onboardingResumePath(authUserId, 'sch-1', serverStatus)).toBe('/onboarding?step=4');
		});
	});

	it('can persist server status without completing the local wizard', () => {
		withSessionStorage(() => {
			const authUserId = 'user-hold-complete';
			const draft = createEmptyDraft();
			draft.maxReachedStep = 4;
			saveDraft(authUserId, draft);

			const serverStatus = {
				wizardCompleted: true,
				maxReachedStep: 4 as const,
				schoolStepSubmitted: true,
				structureStepSubmitted: true,
			};

			expect(mergeOnboardingDraftWithServerStatus(draft, serverStatus, 'sch-1').wizardCompleted).toBe(true);
			expect(mergeOnboardingDraftWithServerStatus(
				draft,
				serverStatus,
				'sch-1',
				{ holdLocalWizardCompleted: true },
			).wizardCompleted).toBe(false);

			const held = persistServerOnboardingStatusToDraft(
				authUserId,
				serverStatus,
				'sch-1',
				{ holdLocalWizardCompleted: true },
			);
			expect(held.wizardCompleted).toBe(false);
			expect(held.schoolStepSubmitted).toBe(true);
			expect(held.structureStepSubmitted).toBe(true);
			expect(held.registeredSchoolId).toBe('sch-1');

			draft.wizardCompleted = true;
			saveDraft(authUserId, draft);
			expect(persistServerOnboardingStatusToDraft(
				authUserId,
				serverStatus,
				'sch-1',
				{ holdLocalWizardCompleted: true },
			).wizardCompleted).toBe(false);
		});
	});

	it('holds the summary after provision until the local wizard is completed', () => {
		expect(shouldHoldOnboardingSummary({
			localWizardCompleted: false,
			provisionProgressVisible: true,
			provisionSucceeded: false,
		})).toBe(true);
		expect(shouldHoldOnboardingSummary({
			localWizardCompleted: false,
			provisionProgressVisible: false,
			provisionSucceeded: true,
		})).toBe(true);
		expect(shouldHoldOnboardingSummary({
			localWizardCompleted: true,
			provisionProgressVisible: true,
			provisionSucceeded: true,
		})).toBe(false);
		expect(shouldHoldOnboardingSummary({
			localWizardCompleted: false,
			provisionProgressVisible: false,
			provisionSucceeded: false,
		})).toBe(false);
	});
});

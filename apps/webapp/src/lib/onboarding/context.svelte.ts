import type { OnboardingDraft, OnboardingStep } from '$lib/onboarding/types';
import { browser } from '$app/environment';
import { authSession } from '$lib/auth/session.svelte';
import {
	clearDraft,
	createEmptyDraft,
	saveDraft,
} from '$lib/onboarding/draft-storage';
import { toCanonicalCatalogText } from '$lib/i18n/catalog-label';
import { persistSyncedOnboardingDraft } from '$lib/onboarding/resume-onboarding';
import { academicYearLabelFromDates } from '$lib/onboarding/school-step-defaults';

class OnboardingContext {
	draft = $state<OnboardingDraft>(createEmptyDraft());
	initialized = $state(false);
	private authUserId = $state<string | null>(null);

	init(authUserId: string) {
		if (!browser) {
			return;
		}

		if (this.authUserId === authUserId && this.initialized) {
			return;
		}

		this.authUserId = authUserId;
		this.draft = persistSyncedOnboardingDraft(authUserId, { schoolId: authSession.schoolId });
		this.initialized = true;
	}

	reset() {
		this.authUserId = null;
		this.draft = createEmptyDraft();
		this.initialized = false;
	}

	persist() {
		this.draft.school.academicYearLabel = academicYearLabelFromDates(
			this.draft.school.academicYearStart,
			this.draft.school.academicYearEnd,
		);
		this.draft.school.periods = this.draft.school.periods.map(period => ({
			...period,
			label: toCanonicalCatalogText(period.label),
		}));
		if (!browser || !this.authUserId) {
			return;
		}
		saveDraft(this.authUserId, this.draft);
	}

	markStepReached(step: OnboardingStep) {
		if (step > this.draft.maxReachedStep) {
			this.draft.maxReachedStep = step;
		}
		this.persist();
	}

	markSchoolStepSubmitted(schoolId?: string | null) {
		this.draft.schoolStepSubmitted = true;
		if (schoolId && schoolId !== 'draft') {
			this.draft.registeredSchoolId = schoolId;
		}
		this.persist();
	}

	markStructureStepSubmitted() {
		this.draft.structureStepSubmitted = true;
		this.persist();
	}

	markStaffStepSubmitted() {
		this.draft.staffStepSubmitted = true;
		this.persist();
	}

	markWizardCompleted() {
		this.draft.wizardCompleted = true;
		this.persist();
	}

	clearStoredDraft() {
		if (!browser || !this.authUserId) {
			return;
		}
		clearDraft(this.authUserId);
		this.draft = createEmptyDraft();
	}
}

export const onboardingContext = new OnboardingContext();

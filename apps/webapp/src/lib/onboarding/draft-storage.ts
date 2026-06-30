import type { OnboardingDraft, OnboardingPeriodDraft, OnboardingSchoolDraft, OnboardingStaffInviteRole, OnboardingStep } from '$lib/onboarding/types';
import { createInitialPeriods } from '$lib/onboarding/school-periods';
import { defaultAcademicYearPreset } from '$lib/onboarding/school-step-defaults';
import { ONBOARDING_DRAFT_VERSION } from '$lib/onboarding/types';

const STORAGE_PREFIX = 'edaya:onboarding:draft';

function isOnboardingStaffInviteRole(value: unknown): value is OnboardingStaffInviteRole {
	return value === 'deputy_director'
		|| value === 'cpe'
		|| value === 'teacher'
		|| value === 'secretary';
}

export function draftStorageKey(authUserId: string): string {
	return `${STORAGE_PREFIX}:${authUserId}`;
}

function defaultTimezone(): string {
	try {
		return new Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
	}
	catch {
		return 'Europe/Paris';
	}
}

export function createEmptyDraft(): OnboardingDraft {
	const yearPreset = defaultAcademicYearPreset();

	return {
		version: ONBOARDING_DRAFT_VERSION,
		updatedAt: new Date().toISOString(),
		maxReachedStep: 1,
		wizardCompleted: false,
		schoolStepSubmitted: false,
		structureStepSubmitted: false,
		staffStepSubmitted: false,
		registeredSchoolId: null,
		school: {
			name: '',
			city: '',
			country: 'France',
			timezone: defaultTimezone(),
			academicYearLabel: yearPreset.label,
			academicYearStart: yearPreset.start,
			academicYearEnd: yearPreset.end,
			periodType: 'trimester',
			periods: createInitialPeriods('trimester', yearPreset.start, yearPreset.end),
		},
		structure: {
			models: [],
			levels: [],
		},
		staffInvites: [],
	};
}

function isOnboardingStep(value: unknown): value is OnboardingStep {
	return value === 1 || value === 2 || value === 3 || value === 4;
}

function normalizePeriod(raw: unknown): OnboardingPeriodDraft | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const candidate = raw as Partial<OnboardingPeriodDraft>;
	if (typeof candidate.id !== 'string' || typeof candidate.label !== 'string') {
		return null;
	}
	return {
		id: candidate.id,
		label: candidate.label,
		start: typeof candidate.start === 'string' ? candidate.start : '',
		end: typeof candidate.end === 'string' ? candidate.end : '',
	};
}

type LegacySchoolDraft = OnboardingSchoolDraft & {
	periodLabel?: string;
	periodStart?: string;
	periodEnd?: string;
};

function normalizeSchoolDraft(candidate: Partial<LegacySchoolDraft>, empty: OnboardingSchoolDraft): OnboardingSchoolDraft {
	const periodType = candidate.periodType === 'semester' ? 'semester' : 'trimester';

	if (Array.isArray(candidate.periods) && candidate.periods.length > 0) {
		const periods = candidate.periods
			.map(normalizePeriod)
			.filter((period): period is OnboardingPeriodDraft => period !== null);
		if (periods.length > 0) {
			return {
				...empty,
				...candidate,
				periodType,
				periods,
			};
		}
	}

	const legacyPeriod = normalizePeriod({
		id: crypto.randomUUID(),
		label: candidate.periodLabel ?? empty.periods[0]?.label ?? 'Trimestre 1',
		start: candidate.periodStart ?? empty.periods[0]?.start ?? empty.academicYearStart,
		end: candidate.periodEnd ?? empty.periods[0]?.end ?? empty.academicYearEnd,
	});

	return {
		...empty,
		name: typeof candidate.name === 'string' ? candidate.name : empty.name,
		city: typeof candidate.city === 'string' ? candidate.city : empty.city,
		country: typeof candidate.country === 'string' ? candidate.country : empty.country,
		timezone: typeof candidate.timezone === 'string' ? candidate.timezone : empty.timezone,
		academicYearLabel: typeof candidate.academicYearLabel === 'string'
			? candidate.academicYearLabel
			: empty.academicYearLabel,
		academicYearStart: typeof candidate.academicYearStart === 'string'
			? candidate.academicYearStart
			: empty.academicYearStart,
		academicYearEnd: typeof candidate.academicYearEnd === 'string'
			? candidate.academicYearEnd
			: empty.academicYearEnd,
		periodType,
		periods: legacyPeriod ? [legacyPeriod] : empty.periods,
	};
}

function normalizeDraft(raw: unknown): OnboardingDraft | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	const candidate = raw as Partial<OnboardingDraft>;
	const version = (raw as { version?: unknown }).version;
	if (version !== 1 && version !== ONBOARDING_DRAFT_VERSION) {
		return null;
	}

	const empty = createEmptyDraft();
	const maxReachedStep = isOnboardingStep(candidate.maxReachedStep)
		? candidate.maxReachedStep
		: empty.maxReachedStep;

	return {
		version: ONBOARDING_DRAFT_VERSION,
		updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : empty.updatedAt,
		maxReachedStep,
		wizardCompleted: candidate.wizardCompleted === true,
		schoolStepSubmitted: candidate.schoolStepSubmitted === true,
		structureStepSubmitted: candidate.structureStepSubmitted === true,
		staffStepSubmitted: candidate.staffStepSubmitted === true,
		registeredSchoolId: typeof candidate.registeredSchoolId === 'string'
			? candidate.registeredSchoolId
			: empty.registeredSchoolId,
		school: normalizeSchoolDraft(candidate.school ?? {}, empty.school),
		structure: {
			models: Array.isArray(candidate.structure?.models)
				? candidate.structure.models.filter((entry): entry is 'college' | 'lycee' => entry === 'college' || entry === 'lycee')
				: empty.structure.models,
			levels: Array.isArray(candidate.structure?.levels)
				? candidate.structure.levels.map(level => ({
						gradeLevelId: typeof level.gradeLevelId === 'string' ? level.gradeLevelId : '',
						classCount: typeof level.classCount === 'number' ? level.classCount : 1,
						capacity: typeof level.capacity === 'number' ? level.capacity : 30,
					}))
				: empty.structure.levels,
		},
		staffInvites: Array.isArray(candidate.staffInvites)
			? candidate.staffInvites.map(invite => ({
					id: typeof invite.id === 'string' ? invite.id : crypto.randomUUID(),
					email: typeof invite.email === 'string' ? invite.email : '',
					role: isOnboardingStaffInviteRole(invite.role) ? invite.role : '',
				}))
			: empty.staffInvites,
	};
}

export function loadDraft(authUserId: string): OnboardingDraft | null {
	if (typeof sessionStorage === 'undefined') {
		return null;
	}

	try {
		const raw = sessionStorage.getItem(draftStorageKey(authUserId));
		if (!raw) {
			return null;
		}
		return normalizeDraft(JSON.parse(raw));
	}
	catch {
		return null;
	}
}

export function saveDraft(authUserId: string, draft: OnboardingDraft): void {
	if (typeof sessionStorage === 'undefined') {
		return;
	}

	const payload: OnboardingDraft = {
		...draft,
		updatedAt: new Date().toISOString(),
	};
	sessionStorage.setItem(draftStorageKey(authUserId), JSON.stringify(payload));
}

export function clearDraft(authUserId: string): void {
	if (typeof sessionStorage === 'undefined') {
		return;
	}
	sessionStorage.removeItem(draftStorageKey(authUserId));
}

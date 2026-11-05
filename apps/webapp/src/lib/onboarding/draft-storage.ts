import type { OnboardingClassNamingMode, OnboardingDraft, OnboardingPeriodDraft, OnboardingSchoolDraft, OnboardingStaffInviteRole, OnboardingStep } from '$lib/onboarding/types';
import { migrateLegacyGradeLevelId } from '$lib/onboarding/legacy-gl-map';
import { createInitialPeriods } from '$lib/onboarding/school-periods';
import {
	academicYearLabelFromDates,
	DEFAULT_ONBOARDING_COUNTRY,
	defaultAcademicYearPreset,
	timezoneForCountry,
} from '$lib/onboarding/school-step-defaults';
import { ONBOARDING_DRAFT_VERSION } from '$lib/onboarding/types';

const STORAGE_PREFIX = 'edaya:onboarding:draft';
const ACCEPTED_DRAFT_VERSIONS = new Set([1, 3, 4, 5, 6, 7, 8]);

function isOnboardingStaffInviteRole(value: unknown): value is OnboardingStaffInviteRole {
	return value === 'deputy_director'
		|| value === 'cpe'
		|| value === 'secretary'
		|| value === 'studies_director'
		|| value === 'it_admin'
		|| value === 'accountant';
}

export function draftStorageKey(authUserId: string): string {
	return `${STORAGE_PREFIX}:${authUserId}`;
}

function defaultTimezone(): string {
	return timezoneForCountry(DEFAULT_ONBOARDING_COUNTRY) ?? 'Africa/Abidjan';
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
			shortName: '',
			city: '',
			country: DEFAULT_ONBOARDING_COUNTRY,
			timezone: defaultTimezone(),
			financeCurrency: '',
			academicYearLabel: yearPreset.label,
			academicYearStart: yearPreset.start,
			academicYearEnd: yearPreset.end,
			periodType: 'trimester',
			periods: createInitialPeriods('trimester', yearPreset.start, yearPreset.end),
		},
		structure: {
			dataset: null,
			templates: [],
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

function resolveAcademicYearDates(
	candidate: Partial<LegacySchoolDraft>,
	empty: OnboardingSchoolDraft,
): Pick<OnboardingSchoolDraft, 'academicYearStart' | 'academicYearEnd' | 'academicYearLabel'> {
	const academicYearStart = typeof candidate.academicYearStart === 'string'
		? candidate.academicYearStart
		: empty.academicYearStart;
	const academicYearEnd = typeof candidate.academicYearEnd === 'string'
		? candidate.academicYearEnd
		: empty.academicYearEnd;
	return {
		academicYearStart,
		academicYearEnd,
		academicYearLabel: academicYearLabelFromDates(academicYearStart, academicYearEnd),
	};
}

function normalizeSchoolDraft(candidate: Partial<LegacySchoolDraft>, empty: OnboardingSchoolDraft): OnboardingSchoolDraft {
	const periodType = candidate.periodType === 'semester' ? 'semester' : 'trimester';

	const rawCountry = typeof candidate.country === 'string' ? candidate.country : empty.country;
	const country = rawCountry.trim();
	const rawTimezone = typeof candidate.timezone === 'string' ? candidate.timezone : empty.timezone;
	const timezone = rawTimezone;
	const yearDates = resolveAcademicYearDates(candidate, empty);

	if (Array.isArray(candidate.periods) && candidate.periods.length > 0) {
		const periods = candidate.periods
			.map(normalizePeriod)
			.filter((period): period is OnboardingPeriodDraft => period !== null);
		if (periods.length > 0) {
			return {
				...empty,
				...candidate,
				country,
				timezone,
				financeCurrency: typeof candidate.financeCurrency === 'string' ? candidate.financeCurrency : '',
				periodType,
				periods,
				...yearDates,
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
		shortName: typeof candidate.shortName === 'string' ? candidate.shortName : '',
		city: typeof candidate.city === 'string' ? candidate.city : empty.city,
		country,
		timezone,
		financeCurrency: typeof candidate.financeCurrency === 'string' ? candidate.financeCurrency : '',
		...yearDates,
		periodType,
		periods: legacyPeriod ? [legacyPeriod] : empty.periods,
	};
}

function normalizeClassCount(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return 0;
	}
	return Math.max(0, Math.trunc(value));
}

function normalizeCapacity(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return 30;
	}
	return Math.max(0, Math.trunc(value));
}

function normalizeClassNamingMode(value: unknown): OnboardingClassNamingMode {
	return value === 'alphabetical' ? 'alphabetical' : 'numerical';
}

function normalizeDatasetReference(value: unknown): OnboardingDraft['structure']['dataset'] {
	if (!value || typeof value !== 'object')
		return null;
	const reference = value as { id?: unknown; version?: unknown };
	return typeof reference.id === 'string' && reference.id.trim() && typeof reference.version === 'string' && /^\d+\.\d+\.\d+$/.test(reference.version)
		? { id: reference.id, version: reference.version }
		: null;
}

function legacyTemplateIds(structure: unknown): unknown[] {
	const models = (structure as { models?: unknown } | undefined)?.models;
	return Array.isArray(models) ? models : [];
}

function normalizeDraft(raw: unknown): OnboardingDraft | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	const candidate = raw as Partial<OnboardingDraft>;
	const version = (raw as { version?: unknown }).version;
	if (typeof version !== 'number' || !ACCEPTED_DRAFT_VERSIONS.has(version)) {
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
		ownerIdentifier: typeof candidate.ownerIdentifier === 'string' ? candidate.ownerIdentifier : undefined,
		school: normalizeSchoolDraft(candidate.school ?? {}, empty.school),
		structure: {
			dataset: version < 8 ? { id: 'ci-general-secondary', version: '1.0.0' } : normalizeDatasetReference(candidate.structure?.dataset),
			templates: version < 8
				? legacyTemplateIds(candidate.structure).flatMap(model => model === 'college' ? ['ci-college'] : model === 'lycee' ? ['ci-lycee'] : [])
				: Array.isArray(candidate.structure?.templates) ? candidate.structure.templates.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())) : [],
			levels: Array.isArray(candidate.structure?.levels)
				? candidate.structure.levels.map(level => ({
						gradeLevelId: typeof level.gradeLevelId === 'string'
							? migrateLegacyGradeLevelId(level.gradeLevelId)
							: '',
						classCount: normalizeClassCount(level.classCount),
						capacity: normalizeCapacity(level.capacity),
						classNamingMode: normalizeClassNamingMode(
							(level as { classNamingMode?: unknown }).classNamingMode,
						),
					}))
				: empty.structure.levels,
		},
		staffInvites: Array.isArray(candidate.staffInvites)
			? candidate.staffInvites
					.map(invite => ({
						id: typeof invite.id === 'string' ? invite.id : crypto.randomUUID(),
						email: typeof invite.email === 'string' ? invite.email : '',
						identifier: typeof invite.identifier === 'string' ? invite.identifier : undefined,
						role: isOnboardingStaffInviteRole(invite.role) ? invite.role : '' as const,
					}))
					.filter(invite => invite.role !== '' || invite.email.trim().length > 0)
			: empty.staffInvites,
	};
}

function readDraftStore(store: Storage | undefined, key: string): string | null {
	try {
		return store?.getItem(key) ?? null;
	}
	catch {
		return null;
	}
}

function writeDraftStore(store: Storage | undefined, key: string, value: string | null): void {
	try {
		if (!store) {
			return;
		}
		if (value) {
			store.setItem(key, value);
			return;
		}
		store.removeItem(key);
	}
	catch {
		// Private mode can deny web storage.
	}
}

export function loadDraft(authUserId: string): OnboardingDraft | null {
	const key = draftStorageKey(authUserId);
	const raw = readDraftStore(globalThis.sessionStorage, key) ?? readDraftStore(globalThis.localStorage, key);
	if (!raw) {
		return null;
	}

	try {
		return normalizeDraft(JSON.parse(raw));
	}
	catch {
		return null;
	}
}

export function saveDraft(authUserId: string, draft: OnboardingDraft): void {
	const payload: OnboardingDraft = {
		...draft,
		updatedAt: new Date().toISOString(),
	};
	const raw = JSON.stringify(payload);
	const key = draftStorageKey(authUserId);
	writeDraftStore(globalThis.sessionStorage, key, raw);
	writeDraftStore(globalThis.localStorage, key, raw);
}

export function clearDraft(authUserId: string): void {
	const key = draftStorageKey(authUserId);
	writeDraftStore(globalThis.sessionStorage, key, null);
	writeDraftStore(globalThis.localStorage, key, null);
}

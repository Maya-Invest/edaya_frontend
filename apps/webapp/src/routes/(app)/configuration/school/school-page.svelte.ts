import type { SchoolRaw } from '$lib/api/school-data';
import type { School, SchoolType } from '$lib/types/school';
import type { SchoolPageSlice } from './lib/school-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { uploadSchoolIssuanceAssetMutation, clearSchoolIssuanceAssetMutation } from '$lib/api/mutations/issuance-asset.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { mapSchoolFromApi, schoolConfigurationIdentityFields } from '$lib/api/school-data';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import { loadSchoolSlice, querySchoolListPage } from './lib/school-queries';
import { runSchoolRouteMutation } from './lib/school-route-mutation';

const SCHOOL_VERSION_FAMILIES = ['school', 'documents'] as const;

const SCHOOL_PAGE_STATE_KEY = Symbol('school-page-state');

export type { SchoolPageSlice };

export type PublicBrandingPurpose = 'school.logo' | 'school.crest';

function schoolConfigurationBase(current: SchoolRaw) {
	return {
		ownerSubjectId: current.ownerSubjectId ?? undefined,
		enforceScheduleConflicts: current.enforceScheduleConflicts ?? false,
		timetableEnforceWorkloadFulfillment: current.timetableEnforceWorkloadFulfillment ?? true,
		timetableExcludeBreakSlots: current.timetableExcludeBreakSlots ?? true,
		timetableMinDayGapSameSubject: current.timetableMinDayGapSameSubject ?? 1,
		timetablePreferredPeriodDefinitionIds: current.timetablePreferredPeriodDefinitionIds ?? [],
		timetableAllowUnassignedTeacherPlacements: current.timetableAllowUnassignedTeacherPlacements ?? false,
		timetableUseHomeroomTeacherFallback: current.timetableUseHomeroomTeacherFallback ?? false,
		timetableGenerationMode: current.timetableGenerationMode ?? 'weekly',
		timetableMinPeriodSpan: current.timetableMinPeriodSpan ?? 1,
		timetableMaxPeriodSpan: current.timetableMaxPeriodSpan ?? 1,
	};
}

function optionalIdentityText(
	input: string | null | undefined,
	current: string | null | undefined,
): string | null {
	if (input === undefined) {
		return current ?? null;
	}
	const trimmed = input?.trim() ?? '';
	return trimmed.length > 0 ? trimmed : null;
}

export class SchoolPageState {
	performUploadSchoolIssuanceAsset = (...args: Parameters<typeof uploadSchoolIssuanceAssetMutation>) => uploadSchoolIssuanceAssetMutation(...args);

	performClearSchoolIssuanceAsset = (...args: Parameters<typeof clearSchoolIssuanceAssetMutation>) => clearSchoolIssuanceAssetMutation(...args);

	slice = $state<SchoolPageSlice | null>(null);

	private readonly versions = new RouteVersionSnapshot(SCHOOL_VERSION_FAMILIES);

	applySlice(data: SchoolPageSlice) {
		this.slice = data;
		this.versions.markLoaded();
	}

	clear() {
		this.slice = null;
	}

	get school() {
		return this.slice?.school ?? null;
	}

	get raw() {
		return this.slice?.raw ?? null;
	}

	applyProfile(data: { school: School; raw: SchoolRaw }) {
		this.slice = data;
	}

	queryListPage() {
		return querySchoolListPage(this);
	}

	async refreshSlice() {
		const data = await loadSchoolSlice();
		this.applySlice(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	async updateSettings(input: {
		name: string;
		timeZone: string;
		financeCurrency: string;
		city?: string | null;
		country?: string | null;
		type?: SchoolType | null;
		issuingName?: string | null;
		postalAddress?: string | null;
		phone?: string | null;
		email?: string | null;
		schoolCode?: string | null;
		publicBrandingPurposes?: PublicBrandingPurpose[];
		successMessage?: string;
	}): Promise<boolean> {
		const school = this.school;
		const current = this.raw;
		if (!school || !current) {
			return false;
		}

		const client = getBrowserSchoolClient();
		const previous = { school, raw: current };
		const identity = schoolConfigurationIdentityFields(current);
		const identityPatch = {
			issuingName: optionalIdentityText(input.issuingName, identity.issuingName),
			postalAddress: optionalIdentityText(input.postalAddress, identity.postalAddress),
			phone: optionalIdentityText(input.phone, identity.phone),
			email: optionalIdentityText(input.email, identity.email),
			schoolCode: optionalIdentityText(input.schoolCode, identity.schoolCode),
			publicBrandingPurposes: input.publicBrandingPurposes ?? identity.publicBrandingPurposes ?? [],
		};
		const patch = {
			name: input.name.trim(),
			timeZone: input.timeZone.trim(),
			city: input.city?.trim() || null,
			country: input.country?.trim() || null,
			type: input.type ?? null,
			...identityPatch,
		};

		const result = await runSchoolRouteMutation({
			request: async () => {
				const saved = await client.commands.updateSchoolConfiguration({
					schoolId: school.id,
					name: patch.name,
					timeZone: patch.timeZone,
					financeCurrency: input.financeCurrency.trim().toUpperCase(),
					city: patch.city,
					country: patch.country,
					type: patch.type,
					...schoolConfigurationBase(current),
					...identity,
					...identityPatch,
				});
				return { school: mapSchoolFromApi(saved), raw: saved };
			},
			successMessage: input.successMessage,
			apply: () =>
				this.applyProfile({
					school: {
						...school,
						...patch,
						city: patch.city ?? '',
						country: patch.country ?? undefined,
					},
					raw: current,
				}),
			rollback: () => this.applyProfile(previous),
			onSuccess: (data) => {
				academicContext.updateSchool(data.school);
				this.applyProfile(data);
			},
		});
		return result !== null;
	}

	async updatePublicBranding(purposes: PublicBrandingPurpose[]): Promise<boolean> {
		const school = this.school;
		const current = this.raw;
		if (!school || !current) {
			return false;
		}

		const nextPurposes = purposes.filter(
			(purpose): purpose is PublicBrandingPurpose => purpose === 'school.logo' || purpose === 'school.crest',
		);
		const client = getBrowserSchoolClient();
		const previous = { school, raw: current };
		const identity = schoolConfigurationIdentityFields(current);

		const result = await runSchoolRouteMutation({
			request: async () => {
				const saved = await client.commands.updateSchoolConfiguration({
					schoolId: school.id,
					name: current.name,
					timeZone: current.timeZone,
					city: current.city ?? null,
					country: current.country ?? null,
					type: current.type ?? null,
					...schoolConfigurationBase(current),
					...identity,
					publicBrandingPurposes: nextPurposes,
				});
				return { school: mapSchoolFromApi(saved), raw: saved };
			},
			apply: () =>
				this.applyProfile({
					school: { ...school, publicBrandingPurposes: nextPurposes },
					raw: { ...current, publicBrandingPurposes: nextPurposes },
				}),
			rollback: () => this.applyProfile(previous),
			onSuccess: (data) => {
				academicContext.updateSchool(data.school);
				this.applyProfile(data);
			},
		});
		return result !== null;
	}
}

export function setSchoolPageState(state: SchoolPageState) {
	setContext(SCHOOL_PAGE_STATE_KEY, state);
}

export function getSchoolPageState() {
	return getContext<SchoolPageState>(SCHOOL_PAGE_STATE_KEY);
}

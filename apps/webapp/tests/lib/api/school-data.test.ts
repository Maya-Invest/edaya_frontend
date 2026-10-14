import type { SchoolRaw } from '$lib/api/school-data';
import { describe, expect, it } from 'bun:test';
import { mapSchoolFromApi, schoolConfigurationIdentityFields } from '$lib/api/school-data';

function school(overrides: Partial<SchoolRaw> = {}): SchoolRaw {
	return {
		id: 'sch-1',
		name: 'École Edaya — Cocody',
		timeZone: 'Africa/Abidjan',
		city: 'Abidjan',
		enforceScheduleConflicts: false,
		timetableEnforceWorkloadFulfillment: true,
		timetableExcludeBreakSlots: true,
		timetableMinDayGapSameSubject: 1,
		timetablePreferredPeriodDefinitionIds: [],
		timetableAllowUnassignedTeacherPlacements: false,
		timetableUseHomeroomTeacherFallback: false,
		timetableGenerationMode: 'weekly',
		timetableMinPeriodSpan: 1,
		timetableMaxPeriodSpan: 1,
		issuingName: 'École Edaya — Cocody',
		postalAddress: 'Boulevard Latrille, Cocody, Abidjan',
		phone: '+225 27 22 44 00 00',
		email: 'secretariat@edaya-ci.test',
		schoolCode: 'EDAYA-CI',
		logoAttachmentId: 'att-logo',
		issuanceAssetVersion: 1,
		publicBrandingPurposes: ['school.logo'],
		...overrides,
	};
}

describe('school identity mapping', () => {
	it('keeps the saved short name when the school is renamed', () => {
		expect(mapSchoolFromApi(school({ name: 'Renamed campus', shortName: 'Saved name' })).shortName).toBe('Saved name');
	});
	it('maps issuing identity and public branding purposes from the API school', () => {
		const mapped = mapSchoolFromApi(school({ financeCurrency: 'EUR' }));
		expect(mapped.financeCurrency).toBe('EUR');
		expect(mapped.shortName).toBe('Cocody');
		expect(mapped.issuingName).toBe('École Edaya — Cocody');
		expect(mapped.schoolCode).toBe('EDAYA-CI');
		expect(mapped.logoAttachmentId).toBe('att-logo');
		expect(mapped.publicBrandingPurposes).toEqual(['school.logo']);
	});

	it('preserves issuing identity when building a configuration patch', () => {
		expect(schoolConfigurationIdentityFields(school({
			publicBrandingPurposes: ['school.logo', 'school.crest'],
		}))).toEqual({
			postalAddress: 'Boulevard Latrille, Cocody, Abidjan',
			phone: '+225 27 22 44 00 00',
			email: 'secretariat@edaya-ci.test',
			schoolCode: 'EDAYA-CI',
			issuingName: 'École Edaya — Cocody',
			publicBrandingPurposes: ['school.logo', 'school.crest'],
		});
	});
});

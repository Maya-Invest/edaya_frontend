import { describe, expect, it } from 'bun:test';
import { formatPermissionGroupLabel, permissionGroupKey, skippedPermissionsByProfile } from '../../../../../src/lib/api/staff-permission-profiles-data';
import { en } from '../../../../../src/lib/i18n/dictionaries/en';
import { profilePermissionGroups } from '../../../../../src/routes/(app)/configuration/permission-profiles/lib/permission-profiles-helpers';

describe('permission profile route helpers', () => {
	it('groups included codes and retains permissions absent from the catalog', () => {
		const result = profilePermissionGroups(['GRADE_READ', 'PAYMENT_READ', 'GRADE_RETIRED'], []);
		expect(result.map(group => [group.key, group.entries.map(entry => entry.permission)])).toEqual([
			['ASSESSMENT', ['GRADE_READ', 'GRADE_RETIRED']],
			['PAYMENT', ['PAYMENT_READ']],
		]);
		expect(result[0].entries[1].entry).toBeUndefined();
		expect(profilePermissionGroups([], [])).toEqual([]);
	});

	it('marks later duplicate permissions as skipped by the first profile', () => {
		const skipped = skippedPermissionsByProfile(
			[
				{
					id: 'first',
					schoolId: 'sch1',
					name: 'First',
					permissions: ['ACCESS_CONTROL_READ'],
				},
				{
					id: 'second',
					schoolId: 'sch1',
					name: 'Second',
					permissions: ['ACCESS_CONTROL_READ', 'STAFF_READ'],
				},
			],
			[
				{
					id: 'b1',
					schoolId: 'sch1',
					staffId: 'st1',
					profileId: 'first',
					academicYearId: 'ay1',
					customScopes: [],
					useDefaultScopes: false,
					warnings: [],
					sortOrder: 0,
				},
				{
					id: 'b2',
					schoolId: 'sch1',
					staffId: 'st1',
					profileId: 'second',
					academicYearId: 'ay1',
					customScopes: [],
					useDefaultScopes: false,
					warnings: [],
					sortOrder: 1,
				},
			],
		);
		expect(skipped.get('first')).toEqual([]);
		expect(skipped.get('second')).toEqual([{ permission: 'ACCESS_CONTROL_READ', ownerProfileId: 'first' }]);
	});
});

it('groups assessments with marks while keeping shared grading configuration separate', () => {
	expect(profilePermissionGroups(['ASSESSMENT_READ', 'ASSESSMENT_MANAGE', 'GRADE_READ', 'GRADE_MANAGE', 'GRADE_VALIDATE', 'GRADE_SCALE_CONFIGURE'], []).map(group => [group.key, group.entries.map(entry => entry.permission)])).toEqual([
		['ASSESSMENT', ['ASSESSMENT_READ', 'ASSESSMENT_MANAGE', 'GRADE_READ', 'GRADE_MANAGE', 'GRADE_VALIDATE']],
		['ACADEMIC', ['GRADE_SCALE_CONFIGURE']],
	]);
	expect(permissionGroupKey('ACADEMIC_CATALOG_READ')).toBe('ACADEMIC');
	expect(formatPermissionGroupLabel('ASSESSMENT', key => en[key] ?? key)).toBe('Assessments and marks');
});

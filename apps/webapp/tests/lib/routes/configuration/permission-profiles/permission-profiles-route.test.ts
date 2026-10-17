import { describe, expect, it } from 'bun:test';
import { profilePermissionGroups } from '../../../../../src/routes/(app)/configuration/permission-profiles/lib/permission-profiles-helpers';
import { skippedPermissionsByProfile } from '../../../../../src/lib/api/staff-permission-profiles-data';

describe('permission profile route helpers', () => {
	it('groups included codes and retains permissions absent from the catalog', () => {
		const result = profilePermissionGroups(['GRADE_READ', 'PAYMENT_READ', 'GRADE_RETIRED'], []);
		expect(result.map(group => [group.key, group.entries.map(entry => entry.permission)])).toEqual([
			['GRADE', ['GRADE_READ', 'GRADE_RETIRED']], ['PAYMENT', ['PAYMENT_READ']],
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
					customScopes: [{ kind: 'school' }],
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
					customScopes: [{ kind: 'school' }],
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

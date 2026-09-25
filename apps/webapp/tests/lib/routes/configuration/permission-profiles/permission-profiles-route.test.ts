import { describe, expect, it } from 'bun:test';
import { skippedPermissionsByProfile } from '../../../../../src/lib/api/staff-permission-profiles-data';

describe('permission profile route helpers', () => {
	it('marks later duplicate permissions as skipped by the first profile', () => {
		const skipped = skippedPermissionsByProfile(
			[
				{
					id: 'first',
					schoolId: 'sch1',
					name: 'First',
					scopeGrain: 'school',
					permissions: ['ACCESS_CONTROL_READ'],
				},
				{
					id: 'second',
					schoolId: 'sch1',
					name: 'Second',
					scopeGrain: 'school',
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
					scopes: [{ kind: 'school' }],
					sortOrder: 0,
				},
				{
					id: 'b2',
					schoolId: 'sch1',
					staffId: 'st1',
					profileId: 'second',
					academicYearId: 'ay1',
					scopes: [{ kind: 'school' }],
					sortOrder: 1,
				},
			],
		);
		expect(skipped.get('first')).toEqual([]);
		expect(skipped.get('second')).toEqual([{ permission: 'ACCESS_CONTROL_READ', ownerProfileId: 'first' }]);
	});
});

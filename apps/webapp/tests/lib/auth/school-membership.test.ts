import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
	pickStaffMembership,
	persistSelectedSchoolId,
	readPersistedSchoolId,
	staffMembershipsFromProfiles,
} from '$lib/auth/school-membership';
import type { AuthorizationProfile } from '$lib/auth/types';

function mockWebStorage() {
	function createStore() {
		const store = new Map<string, string>();
		return {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, value);
			},
			removeItem: (key: string) => {
				store.delete(key);
			},
		};
	}

	Object.defineProperty(globalThis, 'sessionStorage', {
		configurable: true,
		value: createStore(),
	});
}

const staffA: AuthorizationProfile = {
	kind: 'staff',
	actorId: 'staff-b',
	schoolId: 'school-b',
	schoolName: 'Campus Nord',
	schoolShortName: 'Nord',
};
const staffB: AuthorizationProfile = {
	kind: 'staff',
	actorId: 'staff-a',
	schoolId: 'school-a',
	schoolName: 'Lycée — Cocody',
	schoolShortName: 'Cocody',
};

describe('staff school membership helpers', () => {
	beforeEach(() => {
		mockWebStorage();
	});

	afterEach(() => {
		Reflect.deleteProperty(globalThis, 'sessionStorage');
	});

	it('keeps only staff profiles', () => {
		expect(staffMembershipsFromProfiles([
			staffA,
			{ kind: 'teacher', actorId: 't1', schoolId: 'school-a', schoolName: 'Cocody', schoolShortName: 'Cocody' },
		])).toEqual([staffA]);
	});

	it('restores the persisted school when it still matches', () => {
		persistSelectedSchoolId('user-1', 'school-b');
		expect(pickStaffMembership([staffB, staffA], 'user-1')).toEqual(staffA);
		expect(readPersistedSchoolId('user-1')).toBe('school-b');
	});

	it('falls back to a stable actor-id sort when nothing is persisted', () => {
		expect(pickStaffMembership([staffA, staffB], 'user-1')?.actorId).toBe('staff-a');
	});
});

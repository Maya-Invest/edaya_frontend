import { describe, expect, it } from 'bun:test';
import {
	mapStaffImportRoleToProfileRole,
} from '$lib/import/staff/staff-role-labels';

describe('mapStaffImportRoleToProfileRole', () => {
	it('maps webapp FR and EN labels onto stored profile roles', () => {
		expect(mapStaffImportRoleToProfileRole('Secrétaire')).toBe('secretary');
		expect(mapStaffImportRoleToProfileRole('secretary')).toBe('secretary');
		expect(mapStaffImportRoleToProfileRole('Directeur adjoint')).toBe('deputy_director');
		expect(mapStaffImportRoleToProfileRole('CPE / Vie scolaire')).toBe('cpe');
		expect(mapStaffImportRoleToProfileRole('Directeur')).toBe('directeur');
		expect(mapStaffImportRoleToProfileRole('Éducateur')).toBe('educateur');
		expect(mapStaffImportRoleToProfileRole('Comptable')).toBe('accountant');
		expect(mapStaffImportRoleToProfileRole('Informaticien')).toBe('it_admin');
		expect(mapStaffImportRoleToProfileRole('Director of studies')).toBe('studies_director');
	});

	it('leaves teacher labels without a webapp profileRole', () => {
		expect(mapStaffImportRoleToProfileRole('Professeur')).toBeUndefined();
		expect(mapStaffImportRoleToProfileRole('Teacher')).toBeUndefined();
		expect(mapStaffImportRoleToProfileRole('Professeur principal')).toBeUndefined();
		expect(mapStaffImportRoleToProfileRole('Lead teacher')).toBeUndefined();
		expect(mapStaffImportRoleToProfileRole('Portal teacher (teacher app)')).toBeUndefined();
	});
});

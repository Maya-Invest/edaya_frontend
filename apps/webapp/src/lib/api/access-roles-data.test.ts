import { describe, expect, it } from 'bun:test';
import {
	buildPermissionsFromCrudMatrix,
	buildRoleCrudMatrix,
	buildRoleEnabledPermissions,
} from './access-roles-data';

const teacherPermissions = [
	'GRADE_INPUT',
	'GRADE_READ',
	'CLASS_LOGBOOK_CREATE',
	'CLASS_LOGBOOK_READ',
	'CLASS_LOGBOOK_UPDATE',
	'ATTENDANCE_RECORD',
	'ATTENDANCE_READ',
	'DISCIPLINE_CREATE',
	'DISCIPLINE_READ',
	'STUDENT_READ',
	'QUERY_STUDENT_DETAIL_READ',
	'QUERY_REPORT_CARD_DETAIL_READ',
];

const directorPermissions = [
	'GRADE_INPUT',
	'GRADE_READ',
	'GRADE_UPDATE',
	'GRADE_LOCK',
	'REPORT_CARD_GENERATE',
	'REPORT_CARD_CONFIGURE',
	'REPORT_CARD_PUBLISH',
	'REPORT_CARD_LOCK',
	'STAFF_CREATE',
	'STAFF_READ',
	'STAFF_UPDATE',
	'STAFF_ARCHIVE',
	'PAYMENT_RECORD',
	'PAYMENT_CANCEL',
	'FINANCIAL_CONFIG_READ',
	'FINANCIAL_CONFIG_UPDATE',
	'FINANCIAL_CONFIG_CONFIGURE',
	'SCHOOL_STRUCTURE_READ',
	'SCHOOL_STRUCTURE_CONFIGURE',
	'ACADEMIC_PROGRAM_READ',
	'ACADEMIC_PROGRAM_CREATE',
	'ACADEMIC_PROGRAM_DELETE',
	'TIMETABLE_READ',
	'TIMETABLE_CREATE',
	'RESOURCE_READ',
	'RESOURCE_CONFIGURE',
];

describe('access roles data mapping', () => {
	it('maps teacher API permissions to scoped grades and no admin access', () => {
		const matrix = buildRoleCrudMatrix(teacherPermissions);
		const enabled = buildRoleEnabledPermissions(teacherPermissions);

		expect(matrix['grades.edit']).toEqual({ C: true, R: true, U: true, D: false });
		expect(matrix['finance.manage']).toEqual({ C: false, R: false, U: false, D: false });
		expect(matrix['staff.manage']).toEqual({ C: false, R: false, U: false, D: false });
		expect(matrix['config.school']).toEqual({ C: false, R: false, U: false, D: false });
		expect(enabled['grades.edit']).toBe(true);
		expect(enabled['finance.manage']).toBe(false);
	});

	it('maps director API permissions to full admin CRUD', () => {
		const matrix = buildRoleCrudMatrix(directorPermissions);

		expect(matrix['finance.manage']).toEqual({ C: true, R: true, U: true, D: true });
		expect(matrix['staff.manage']).toEqual({ C: true, R: true, U: true, D: true });
		expect(matrix['config.school']).toEqual({ C: true, R: true, U: true, D: true });
		expect(matrix['grades.edit']).toEqual({ C: true, R: true, U: true, D: true });
	});

	it('rebuilds API permissions as superset of mapped CRUD matrix', () => {
		const matrix = buildRoleCrudMatrix(teacherPermissions);
		const rebuilt = buildPermissionsFromCrudMatrix(matrix);

		for (const permission of teacherPermissions) {
			expect(rebuilt).toContain(permission);
		}
	});
});

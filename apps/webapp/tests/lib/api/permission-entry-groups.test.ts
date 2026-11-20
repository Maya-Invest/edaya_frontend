import { describe, expect, it } from 'bun:test';
import { formatPermissionGroupLabel, groupPermissionEntries } from '../../../src/lib/api/staff-permission-profiles-data';
import { en } from '../../../src/lib/i18n/dictionaries/en';
import { fr } from '../../../src/lib/i18n/dictionaries/fr';

describe('permission assignment categories', () => {
	it('preserves category and assignment order without merging repeated permissions', () => {
		const rows = [
			{ id: 'math', permission: 'GRADE_READ', scope: 'math' },
			{ id: 'cashier', permission: 'PAYMENT_RECORD', scope: 'class-a' },
			{ id: 'assessment', permission: 'ASSESSMENT_MANAGE', scope: 'class-b' },
			{ id: 'english', permission: 'GRADE_READ', scope: 'english' },
			{ id: 'scale', permission: 'GRADE_SCALE_CONFIGURE', scope: '' },
			{ id: 'unknown', permission: 'LEGACY_RETIRED', scope: 'class-c' },
		];
		const result = groupPermissionEntries(rows);
		expect(result.map(group => [group.key, group.entries.map(row => row.id)])).toEqual([
			['ASSESSMENT', ['math', 'assessment', 'english']],
			['PAYMENT', ['cashier']],
			['ACADEMIC', ['scale']],
			['LEGACY', ['unknown']],
		]);
		expect(result[0].entries[2]).toBe(rows[3]);
		expect(rows.map(row => row.id)).toEqual(['math', 'cashier', 'assessment', 'english', 'scale', 'unknown']);
		expect(groupPermissionEntries([])).toEqual([]);
	});

	it('uses the profile category labels in both languages, with an unknown-category fallback', () => {
		expect(formatPermissionGroupLabel('ASSESSMENT', key => en[key] ?? key)).toBe('Assessments and marks');
		expect(formatPermissionGroupLabel('ASSESSMENT', key => fr[key] ?? key)).toBe('Évaluations et notes');
		expect(formatPermissionGroupLabel('ACADEMIC', key => fr[key] ?? key)).toBe('Configuration pédagogique');
		expect(formatPermissionGroupLabel('LEGACY', key => fr[key] ?? key)).toBe('Legacy');
	});
});

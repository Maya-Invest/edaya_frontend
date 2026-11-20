import { expect, mock, test } from 'bun:test';

// Icons are rendering dependencies; this suite checks the import selector contract.
mock.module('$lib/icons', () => Object.fromEntries([
	'BookOpen', 'Users', 'User', 'GraduationCap', 'HeartHandshake', 'Layers',
	'Receipt', 'Wallet', 'ClipboardCheck', 'FileText',
].map(name => [name, () => null])));
const { IMPORT_TYPE_DEFINITIONS, getImportTypeDefinition } = await import('$lib/import/catalog/import-types');

const types = [
	'students', 'guardians', 'staff', 'teachers', 'classes', 'subjects',
	'teacher_assignments', 'chapters', 'billing', 'payments',
	'academic_disciplines', 'placement_statuses', 'guardian_relationships', 'class_offerings',
] as const;

test('the selector exposes every supported import type exactly once', () => {
	expect(IMPORT_TYPE_DEFINITIONS.map(item => item.key).sort()).toEqual([...types].sort());
});

for (const type of types) {
	test(`${type} keeps its API identity and format-specific template names`, () => {
		const item = getImportTypeDefinition(type);
		expect(item.key).toBe(type);
		expect(item.status).toBe('active');
		expect(item.csvFilename).toBe(`${type}-v2.csv`);
		expect(item.xlsxFilename).toBe(`${type}-v2.xlsx`);
		expect(item.xlsxSheetName).toBe(type);
		expect(item.permission).toBeTruthy();
		// Template columns and business validation remain authoritative API inputs.
		expect(item.columns).toEqual([]);
		expect(item.exampleRow).toEqual({});
	});
}

import { afterEach, describe, expect, test } from 'bun:test';
import { loadTableColumnKeys, resolveTableColumnKeys, saveTableColumnKeys, tableColumnStorageKey } from '$lib/list/table-column-preferences';
import type { ListEntityTableColumn } from '$lib/list/list-entity-table-types';
const columns: ListEntityTableColumn[] = [
	{ key: 'name', label: 'Name', span: 3 },
	{ key: 'email', label: 'Email', span: 2 },
	{ key: 'original', label: 'Original name', span: 2, defaultVisible: false },
	{ key: 'health', label: 'Health', span: 2, defaultVisible: false, available: false },
	{ key: 'actions', label: '', span: 1 },
];
const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => { if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else Reflect.deleteProperty(globalThis, 'localStorage'); });
describe('table column preferences', () => {
	test('keeps identity and actions, defaults and fixed order while discarding unavailable and obsolete keys', () => {
		expect(resolveTableColumnKeys(columns)).toEqual(['name', 'email', 'actions']);
		expect(resolveTableColumnKeys(columns, ['original', 'health', 'obsolete'])).toEqual(['name', 'original', 'actions']);
		expect(resolveTableColumnKeys(columns, [])).toEqual(['name', 'actions']);
		expect(resolveTableColumnKeys([columns[0]!, columns[4]!, columns[2]!], ['original'])).toEqual(['name', 'original', 'actions']);
	});
	test('isolates user, school and list and round-trips only versioned keys', () => {
		const values = new Map<string, string>();
		Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
		const key = tableColumnStorageKey('user:1', 'school:1', 'students');
		saveTableColumnKeys(key, ['name', 'original']);
		expect(JSON.parse(values.get(key)!)).toEqual({ version: 1, keys: ['name', 'original'] });
		expect(loadTableColumnKeys(key)).toEqual(['name', 'original']);
		for (const other of [tableColumnStorageKey('user:2', 'school:1', 'students'), tableColumnStorageKey('user:1', 'school:2', 'students'), tableColumnStorageKey('user:1', 'school:1', 'teachers')]) expect(loadTableColumnKeys(other)).toBeNull();
		for (const invalid of ['{', '{"version":2,"keys":["name"]}', '{"version":1,"keys":[false]}']) { values.set(key, invalid); expect(loadTableColumnKeys(key)).toBeNull(); }
	});
	test('falls back safely when browser storage is unavailable', () => {
		Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage disabled'); } });
		expect(loadTableColumnKeys('disabled')).toBeNull();
		expect(() => saveTableColumnKeys('disabled', ['name'])).not.toThrow();
	});
});

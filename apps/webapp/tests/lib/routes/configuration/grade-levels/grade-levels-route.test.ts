import { describe, expect, it } from 'bun:test';
import { gradeLevelIdFromUrl, retainsGradeLevelDraft } from '../../../../../src/routes/(app)/configuration/structure/levels/lib/grade-levels-helpers';

describe('grade-levels route helpers', () => {
	it('parses grade level id from the selected level filter', () => {
		const url = new URL('http://local/configuration/structure/subjects?gradeLevel=gl-6');
		expect(gradeLevelIdFromUrl(url)).toBe('gl-6');
	});
});


describe('grading confirmation draft navigation', () => {
	it('retains edits through confirmation and Back, including creation', () => {
		for (const modal of ['edit-level', 'create-level']) {
			const edit = new URL(`http://local/configuration/structure/details?gradeLevel=level&year=year&modal=${modal}`);
			const confirm = new URL(edit);
			confirm.searchParams.set('modalStep', 'confirm');
			expect(retainsGradeLevelDraft(edit, confirm)).toBe(true);
			expect(retainsGradeLevelDraft(confirm, edit)).toBe(true);
		}
	});
	it('still guards closing, other records and academic scopes', () => {
		const edit = new URL('http://local/configuration/structure/details?gradeLevel=level&year=year&modal=edit-level');
		for (const [key, value] of [['gradeLevel', 'other'], ['year', 'other'], ['modal', 'create-level'], ['modalTarget', 'other'], ['modalStep', 'unknown']]) {
			const next = new URL(edit);
			next.searchParams.set(key!, value!);
			expect(retainsGradeLevelDraft(edit, next)).toBe(false);
		}
		const closed = new URL(edit);
		closed.searchParams.delete('modal');
		expect(retainsGradeLevelDraft(edit, closed)).toBe(false);
		expect(retainsGradeLevelDraft(edit, new URL('http://local/dashboard'))).toBe(false);
		expect(retainsGradeLevelDraft(edit, new URL(edit.href.replace('http://local', 'http://foreign')))).toBe(false);
	});
});

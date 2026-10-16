import { describe, expect, it } from 'bun:test';
import { legacyStructureHref, selectedStructureLevel, structureHref, structureTab } from '../../../../../src/routes/(app)/configuration/structure/lib/structure-navigation';
import { isKnownModalForPathname } from '../../../../../src/lib/modal/route-modal-catalog';

const url = (path: string) => new URL(path, 'http://localhost');
describe('combined level configuration', () => {
	it('preserves the chosen tab and level search while clearing the previous record and form', () => {
		expect(structureHref(url('/configuration/structure/classes/class-1/profile?gradeLevel=gl-6&q=A&levelQ=college&modal=edit'), 'gl-5')).toBe('/configuration/structure/classes?gradeLevel=gl-5&levelQ=college');
	});
	it('defaults to Details and preserves the tab when selecting another level', () => {
		expect(structureTab('/configuration/structure')).toBe('details');
		expect(structureHref(url('/configuration/structure/details?gradeLevel=gl-6&modal=edit-level'), 'gl-5')).toBe('/configuration/structure/details?gradeLevel=gl-5');
	});
	it('switches tabs without losing the selected level', () => {
		expect(structureHref(url('/configuration/structure/subjects?gradeLevel=gl-6'), 'gl-6', 'classes')).toBe('/configuration/structure/classes?gradeLevel=gl-6');
	});
	it('selects a valid default after deletion or an invalid link, including an empty school', () => {
		const levels = [{ id: 'gl-6' }, { id: 'gl-5' }];
		expect(selectedStructureLevel(levels, 'gl-5')?.id).toBe('gl-5');
		expect(selectedStructureLevel(levels, 'deleted')?.id).toBe('gl-6');
		expect(selectedStructureLevel([], null)).toBeUndefined();
	});
	it('redirects old subject and class details with their filters, tab and form', () => {
		expect(legacyStructureHref(url('/configuration/subjects/gls-1/progression?gradeLevel=gl-6&modal=edit-subject'))).toBe('/configuration/structure/subjects/gls-1/progression?gradeLevel=gl-6&modal=edit-subject');
		expect(legacyStructureHref(url('/configuration/classes/class-1/assignments?modal=form'))).toBe('/configuration/structure/classes/class-1/assignments?modal=form');
	});
	it('redirects old level settings into the Details tab', () => {
		expect(legacyStructureHref(url('/configuration/grade-levels/gl-6?modal=grading&modalStep=confirm'))).toBe('/configuration/structure/details?modal=level-grading&modalStep=confirm&gradeLevel=gl-6');
		expect(legacyStructureHref(url('/configuration/grade-levels?modal=create'))).toBe('/configuration/structure/details?modal=create-level');
	});
	it('keeps level forms available in all tabs without permitting unrelated forms', () => {
		for (const path of ['/configuration/structure/details', '/configuration/structure/subjects', '/configuration/structure/classes']) {
			expect(isKnownModalForPathname(path, 'level-grading')).toBe(true);
			expect(isKnownModalForPathname(path, 'edit-level')).toBe(true);
			expect(isKnownModalForPathname(path, 'edit-profile')).toBe(false);
		}
	});
});

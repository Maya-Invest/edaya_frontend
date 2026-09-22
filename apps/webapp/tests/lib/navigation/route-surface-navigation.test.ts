import { describe, expect, it } from 'bun:test';
import {
	currentRouteSurfaceHref,
	listSurfaceHref,
	stripModalSearch,
} from '$lib/navigation/route-surface-navigation';

describe('detail drawer surface hrefs', () => {
	it('strips modal params while keeping list filters', () => {
		const url = new URL('http://local/school/students/stu-1/attendance?q=ada&modal=edit-profile&modalTarget=x');
		expect(stripModalSearch(url)).toBe('?q=ada');
		expect(listSurfaceHref('/school/students', url)).toBe('/school/students?q=ada');
	});

	it('records the current list href without modal params as the Back parent', () => {
		const url = new URL('http://local/school/teachers?q=marie&modal=create');
		expect(currentRouteSurfaceHref(url)).toBe('/school/teachers?q=marie');
	});

	it('keeps a direct-link close target equal to the list path', () => {
		const url = new URL('http://local/classes/6a/evaluations/e-1/grading');
		expect(listSurfaceHref('/classes/6a/evaluations', url)).toBe('/classes/6a/evaluations');
	});
});

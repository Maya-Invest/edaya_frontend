import * as navigation from '$app/navigation';
import { replacementRouteSurfaceHistoryState } from '$lib/navigation/route-surface-history';
import {
	closeRouteSurface,
	openDetailDrawer,
	currentRouteSurfaceHref,
	listSurfaceHref,
	stripModalSearch,
} from '$lib/navigation/route-surface-navigation';
import { describe, expect, it, spyOn } from 'bun:test';

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

describe('modal completion navigation', () => {
	it('replaces a closing modal with the created profile without navigating back over it', async () => {
		const goto = spyOn(navigation, 'goto');
		try {
			closeRouteSurface('/school/staff');
			openDetailDrawer('/school/staff/new-person/profile', '/school/staff?modal=create');
			await Promise.resolve();
			expect(goto).toHaveBeenCalledTimes(1);
			expect(goto.mock.calls[0]).toEqual([
				'/school/staff/new-person/profile',
				{
					keepFocus: true,
					noScroll: true,
					replaceState: true,
					state: { routeSurfaceParent: undefined, routeSurfaceDepth: undefined },
				},
			]);
		}
		finally { goto.mockRestore(); }
	});

	it('still closes a modal when no replacement navigation follows', async () => {
		const goto = spyOn(navigation, 'goto');
		try {
			closeRouteSurface('/school/staff');
			await Promise.resolve();
			expect(goto).toHaveBeenCalledTimes(1);
			expect(goto.mock.calls[0]?.[0]).toBe('/school/staff');
		}
		finally { goto.mockRestore(); }
	});
});

it('preserves known parent history and never invents a Back entry for direct links', () => {
	expect(replacementRouteSurfaceHistoryState('/school/staff', {})).toEqual({
		routeSurfaceParent: undefined,
		routeSurfaceDepth: undefined,
	});
	expect(replacementRouteSurfaceHistoryState('/school/staff', {
		routeSurfaceParent: '/school/staff',
		routeSurfaceDepth: 2,
	})).toEqual({ routeSurfaceParent: '/school/staff', routeSurfaceDepth: 2 });
});

import { describe, expect, it } from 'bun:test';
import {
	nestedRouteSurfaceHistoryState,
	routeSurfaceBackDelta,
	routeSurfaceHistoryState,
} from '$lib/navigation/route-surface-history';

describe('route surface history', () => {
	it('records the canonical parent at history depth one', () => {
		const state = routeSurfaceHistoryState('/school/students?q=ada');
		expect(state).toEqual({
			routeSurfaceParent: '/school/students?q=ada',
			routeSurfaceDepth: 1,
		});
	});

	it('returns a Back delta only for the exact recorded parent', () => {
		const state = routeSurfaceHistoryState('/school/students');
		expect(routeSurfaceBackDelta(state, '/school/students')).toBe(-1);
		expect(routeSurfaceBackDelta(state, '/school/staff')).toBeNull();
	});

	it('tracks nested wizard/tab entries so close skips the full routed surface', () => {
		const opened = routeSurfaceHistoryState('/configuration/tools');
		const stepTwo = nestedRouteSurfaceHistoryState(opened);
		const stepThree = nestedRouteSurfaceHistoryState(stepTwo);
		expect(stepThree.routeSurfaceDepth).toBe(3);
		expect(routeSurfaceBackDelta(stepThree, '/configuration/tools')).toBe(-3);
	});

	it('uses canonical replacement for direct links without parent metadata', () => {
		expect(routeSurfaceBackDelta({}, '/school/students')).toBeNull();
	});
});

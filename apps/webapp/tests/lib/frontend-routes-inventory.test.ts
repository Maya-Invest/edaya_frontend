import { describe, expect, it } from 'bun:test';
import {
	LEGACY_ROUTES,
	ROUTE_DESCRIPTIONS,
	ROUTE_REDIRECTS,
} from '../../scripts/qa-route-catalog';

describe('frontend routes inventory compatibility routes', () => {
	it('registers teacher assignments compatibility routing', () => {
		const route = '/school/teacher-assignments';
		expect(ROUTE_REDIRECTS[route]).toBe('/configuration/tools/teacher-assignments');
		expect(LEGACY_ROUTES.has(route)).toBe(true);
		expect(ROUTE_DESCRIPTIONS[route]).toBeTruthy();
	});

	it('registers subject level compatibility routing', () => {
		const route = '/configuration/subjects/level/:level?';
		expect(ROUTE_REDIRECTS[route]).toBe('/configuration/subjects?gradeLevel=:level');
		expect(LEGACY_ROUTES.has(route)).toBe(true);
		expect(ROUTE_DESCRIPTIONS[route]).toBeTruthy();
	});
});

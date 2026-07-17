import { describe, expect, it } from 'bun:test';
import {
	activeSessionDetailTab,
	sessionDetailTabsForKind,
} from '../../../../../src/routes/(app)/classes/[classId]/timetable/lib/timetable-detail-tabs';
import { sessionDetailIdFromUrl } from '../../../../../src/routes/(app)/classes/[classId]/timetable/lib/timetable-helpers';
import { listRouteCacheKey } from '$lib/detail-route-patterns';
import { detailHref } from '$lib/detail-hrefs';

describe('class timetable route helpers', () => {
	it('reads session id from drawer paths', () => {
		expect(sessionDetailIdFromUrl(new URL('http://local/classes/6a/timetable/s-1/details'))).toBe('s-1');
		expect(sessionDetailIdFromUrl(new URL('http://local/classes/6a/timetable/s-1/attendance'))).toBe('s-1');
	});

	it('resolves active tab from pathname', () => {
		expect(activeSessionDetailTab('/classes/6a/timetable/s-1', '6a', 's-1')).toBe('details');
		expect(activeSessionDetailTab('/classes/6a/timetable/s-1/details', '6a', 's-1')).toBe('details');
		expect(activeSessionDetailTab('/classes/6a/timetable/s-1/attendance', '6a', 's-1')).toBe('attendance');
		expect(activeSessionDetailTab('/classes/6a/timetable/s-1/logbook', '6a', 's-1')).toBe('logbook');
	});

	it('hides logbook tab for assessments', () => {
		expect(sessionDetailTabsForKind('assessment')).toEqual(['details', 'attendance']);
		expect(sessionDetailTabsForKind('lesson')).toEqual(['details', 'attendance', 'logbook']);
	});

	it('builds tab hrefs for session drawer navigation', () => {
		expect(detailHref.classPlanningTab('6a', 's-1', 'attendance')).toBe('/classes/6a/timetable/s-1/attendance');
		expect(detailHref.classPlanning('6a', 's-1')).toBe('/classes/6a/timetable/s-1/details');
	});

	it('maps timetable drawer paths to the list route cache key', () => {
		expect(listRouteCacheKey(new URL('http://local/classes/6a/timetable'))).toBe('/classes/6a/timetable');
		expect(listRouteCacheKey(new URL('http://local/classes/6a/timetable/s-1'))).toBe('/classes/6a/timetable');
		expect(listRouteCacheKey(new URL('http://local/classes/6a/timetable/s-1/details'))).toBe('/classes/6a/timetable');
		expect(listRouteCacheKey(new URL('http://local/classes/6a/timetable/s-1/attendance'))).toBe('/classes/6a/timetable');
	});
});

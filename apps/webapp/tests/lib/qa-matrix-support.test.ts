import { describe, expect, test } from 'bun:test';
import {
	buildTimetableSessionPath,
	emptyEntities,
	encodePathSegment,
	isClassDailyAttendanceSidebarPath,
	resolveEndpoint,
	sidebarSmokeStartPath,
	timetableWeekFromSessionId,
} from '../../scripts/qa-matrix-support';

describe('qa-matrix-support timetable paths', () => {
	test('encodePathSegment encodes colon session ids', () => {
		expect(encodePathSegment('sch-abc:2026-08-16')).toBe('sch-abc%3A2026-08-16');
	});

	test('timetableWeekFromSessionId extracts schedule date', () => {
		expect(timetableWeekFromSessionId('sch-abc:2026-08-16')).toBe('2026-08-16');
		expect(timetableWeekFromSessionId('plain-id')).toBeNull();
	});

	test('buildTimetableSessionPath adds encoded session and week query', () => {
		const path = buildTimetableSessionPath('class-1', 'sch-abc:2026-08-16', 'details');
		expect(path).toBe('/classes/class-1/timetable/sch-abc%3A2026-08-16/details?week=2026-08-16');
	});

	test('resolveEndpoint encodes sessionId and appends week for timetable routes', () => {
		const entities = {
			...emptyEntities(),
			classId: 'class-1',
			sessionId: 'sch-abc:2026-08-16',
			timetableWeek: '2026-08-16',
		};
		const url = resolveEndpoint(
			'http://localhost:5173/classes/[classId]/timetable/[sessionId]/attendance',
			'http://localhost:5173',
			entities,
		);
		expect(url).toBe(
			'http://localhost:5173/classes/class-1/timetable/sch-abc%3A2026-08-16/attendance?week=2026-08-16',
		);
	});

	test('sidebarSmokeStartPath uses a class page for class-segment hrefs', () => {
		expect(sidebarSmokeStartPath('/classes/c1/timetable', 'c1')).toBe('/classes/c1/students');
		expect(sidebarSmokeStartPath('/school/students', 'c1')).toBe('/dashboard');
		expect(sidebarSmokeStartPath('/classes/c1/timetable', null)).toBe('/dashboard');
	});

	test('isClassDailyAttendanceSidebarPath matches only the class attendance tab', () => {
		expect(isClassDailyAttendanceSidebarPath('/classes/c1/attendance')).toBe(true);
		expect(isClassDailyAttendanceSidebarPath('/classes/c1/timetable')).toBe(false);
		expect(isClassDailyAttendanceSidebarPath('/classes/c1/students/s1/attendance')).toBe(false);
		expect(isClassDailyAttendanceSidebarPath('/classes/c1/timetable/sess/attendance')).toBe(false);
	});

	test('messaging detail resolves a conversation id without falling back to a child id', () => {
		const entities = { ...emptyEntities(), studentId: 'child', conversationId: 'thread' };
		expect(resolveEndpoint('/school/messages/[id]', 'http://local', entities)).toBe('http://local/school/messages/thread');
		expect(resolveEndpoint('/school/messages/[id]', 'http://local', { ...entities, conversationId: null })).toBeNull();
	});

	test('resolveEndpoint substitutes family-feedback campaign ids', () => {
		const entities = {
			...emptyEntities(),
			studentId: 'stu-1',
			familyFeedbackCampaignId: 'ff-campaign-1',
		};
		expect(
			resolveEndpoint(
				'http://localhost:5173/school/family-feedback/[id]/setup?modal=edit',
				'http://localhost:5173',
				entities,
			),
		).toBe('http://localhost:5173/school/family-feedback/ff-campaign-1/setup?modal=edit');
	});

	test('resolveEndpoint skips family-feedback detail without a campaign id', () => {
		expect(
			resolveEndpoint(
				'http://localhost:5173/school/family-feedback/[id]/setup',
				'http://localhost:5173',
				emptyEntities(),
			),
		).toBeNull();
	});
});

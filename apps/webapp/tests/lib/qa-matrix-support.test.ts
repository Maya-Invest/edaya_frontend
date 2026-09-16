import { describe, expect, test } from 'bun:test';
import {
	buildTimetableSessionPath,
	emptyEntities,
	encodePathSegment,
	resolveEndpoint,
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
});

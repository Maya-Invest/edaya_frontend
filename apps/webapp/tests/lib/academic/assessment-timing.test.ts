import { describe, expect, it } from 'bun:test';
import { kindCompleteAssessmentTiming } from '$lib/academic/assessment-timing';

describe('kindCompleteAssessmentTiming', () => {
	it('keeps homework dueAt and clears in-class fields', () => {
		expect(kindCompleteAssessmentTiming({
			kind: 'homework',
			dueAt: '2026-09-21',
			startsAt: '2026-09-21T09:00:00.000Z',
			endsAt: '2026-09-21T10:00:00.000Z',
			lessonSessionId: 'ls-1',
		})).toEqual({
			kind: 'homework',
			dueAt: '2026-09-21',
			startsAt: null,
			endsAt: null,
			lessonSessionId: null,
		});
	});

	it('does not convert homework to a quiz window', () => {
		expect(kindCompleteAssessmentTiming({
			kind: 'homework',
			startsAt: '2026-09-21T09:00:00.000Z',
			endsAt: '2026-09-21T10:00:00.000Z',
		})).toBeNull();
	});

	it('requires a visible in-class window or lesson session', () => {
		expect(kindCompleteAssessmentTiming({ kind: 'quiz' })).toBeNull();
		expect(kindCompleteAssessmentTiming({
			kind: 'quiz',
			startsAt: '2026-09-21T13:00:00.000Z',
			endsAt: '2026-09-21T14:00:00.000Z',
		})).toEqual({
			kind: 'quiz',
			dueAt: null,
			startsAt: '2026-09-21T13:00:00.000Z',
			endsAt: '2026-09-21T14:00:00.000Z',
			lessonSessionId: null,
		});
		expect(kindCompleteAssessmentTiming({
			kind: 'project',
			lessonSessionId: 'ls-1',
		})).toEqual({
			kind: 'project',
			dueAt: null,
			startsAt: null,
			endsAt: null,
			lessonSessionId: 'ls-1',
		});
	});
});

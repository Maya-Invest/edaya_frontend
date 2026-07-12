import { describe, expect, test } from 'bun:test';
import { ApiError } from '@maya-invest/edaya-api-client';
import { en } from '$lib/i18n/dictionaries/en';
import { parseTimetableGenerationError } from '$lib/components/school/scheduling/timetable-generation-errors';

const translate = (key: string) => (en as Record<string, string>)[key] ?? key;

describe('timetable-generation-errors', () => {
	test('maps workload errors to guidance keys and preserves API detail', () => {
		const error = new ApiError(422, {
			code: 'TIMETABLE_WORKLOAD_UNSATISFIED',
			message: 'Could not place 4 periods for class subject ci-cs-6a-fr in week 2025-12-15',
		});

		const parsed = parseTimetableGenerationError(error, translate);

		expect(parsed.code).toBe('TIMETABLE_WORKLOAD_UNSATISFIED');
		expect(parsed.summary).toContain('workload');
		expect(parsed.detail).toBe('Could not place 4 periods for class subject ci-cs-6a-fr in week 2025-12-15');
		expect(parsed.guidanceKeys).toContain('timetable.guidance.disableWorkloadEnforcement');
		expect(parsed.guidanceKeys).toContain('timetable.guidance.reduceSubjectGap');
	});

	test('falls back to API message for unknown codes', () => {
		const parsed = parseTimetableGenerationError(new ApiError(500, {
			message: 'Unexpected solver failure',
		}), translate);

		expect(parsed.summary).toBe('Unexpected solver failure');
		expect(parsed.guidanceKeys).toEqual([]);
	});
});

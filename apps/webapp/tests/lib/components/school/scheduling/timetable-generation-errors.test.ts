import { en } from '$lib/i18n/dictionaries/en';
import { fr } from '$lib/i18n/dictionaries/fr';
import { ApiError } from '@maya-invest/edaya-api-client';
import { describe, expect, test } from 'bun:test';
import { parseTimetableGenerationError } from '../../../../../src/routes/(app)/configuration/tools/lib/timetable-generation-errors';

function translator(dictionary: Record<string, string>) {
	return (key: string, vars?: Record<string, string | number>) => Object.entries(vars ?? {}).reduce(
		(text, [name, value]) => text.replace(`{${name}}`, String(value)),
		dictionary[key] ?? key,
	);
}
const details = { classGroupId: 'ci-6a', classSubjectId: 'ci-cs-6a-ang', weekKey: '2026-09-14', required: 3, placed: 2 };
const context = { classLabels: { 'ci-6a': '6ème 1' }, classSubjectLabels: { 'ci-cs-6a-ang': 'Anglais' }, locale: 'fr-FR' };

describe('timetable-generation-errors', () => {
	test('explains the missing periods in French with class and subject names', () => {
		const parsed = parseTimetableGenerationError(new ApiError(409, {
			code: 'TIMETABLE_WORKLOAD_UNSATISFIED',
			message: 'Could not place 2/3 periods for class subject ci-cs-6a-ang in week 2026-09-14',
			details,
		}), translator(fr), context);
		expect(parsed.detail).toBe('6ème 1 · Anglais : 2 périodes placées sur 3 pour la semaine du 14 sept. 2026. Périodes manquantes : 1.');
		expect(parsed.summary).not.toContain('Could not');
		expect(parsed.guidanceKeys).toContain('timetable.guidance.disableWorkloadEnforcement');
		expect(parsed.guidanceKeys).toContain('timetable.guidance.reduceSubjectGap');
	});

	test('localizes English and weekly-template failures', () => {
		const parsed = parseTimetableGenerationError(new ApiError(409, {
			code: 'TIMETABLE_WORKLOAD_UNSATISFIED',
			details: { ...details, weekKey: '__template__' },
		}), translator(en), { ...context, locale: 'en-US' });
		expect(parsed.detail).toContain('2 of 3 periods placed in the weekly pattern');
		expect(parsed.detail).toContain('Missing periods: 1');
	});

	test('never exposes technical IDs or raw English detail for a known failure', () => {
		for (const value of [undefined, { ...details, placed: '2' }, { ...details, weekKey: 'invalid' }]) {
			const parsed = parseTimetableGenerationError(new ApiError(409, {
				code: 'TIMETABLE_WORKLOAD_UNSATISFIED',
				message: 'Could not place periods for ci-cs-6a-ang',
				details: value,
			}), translator(fr), context);
			expect(parsed.detail).toBeUndefined();
		}
		const parsed = parseTimetableGenerationError(new ApiError(409, { code: 'TIMETABLE_WORKLOAD_UNSATISFIED', details }), translator(fr));
		expect(parsed.detail).toContain('Classe sélectionnée · Matière');
		expect(parsed.detail).not.toContain('ci-');
	});

	test('falls back to API message for unknown codes', () => {
		const parsed = parseTimetableGenerationError(new ApiError(500, { message: 'Unexpected solver failure' }), translator(en));
		expect(parsed.summary).toBe('Unexpected solver failure');
		expect(parsed.guidanceKeys).toEqual([]);
	});
});

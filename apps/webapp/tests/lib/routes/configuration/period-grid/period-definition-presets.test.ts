import { describe, expect, test } from 'bun:test';
import {
	clonePeriodDefinitionPreset,
	expandPeriodDefinitionTemplate,
	isTeachingSlotForExpandedRow,
} from '../../../../../src/routes/(app)/configuration/academic/lib/period-definition-presets';

describe('period-definition-presets', () => {
	test('expands standard secondary across weekdays', () => {
		const preset = clonePeriodDefinitionPreset('standard-secondary');
		const expanded = expandPeriodDefinitionTemplate(preset);
		expect(expanded).toHaveLength(preset.template.length * preset.weekdays.length);
		expect(expanded.every(slot => slot.dayOfWeek !== undefined)).toBe(true);
		expect(expanded.filter(slot => slot.dayOfWeek === 'monday')).toHaveLength(preset.template.length);
	});

	test('marks half-day wednesday afternoon as non-teaching', () => {
		const preset = clonePeriodDefinitionPreset('half-day-wednesday');
		const afternoon = preset.template.find(row => !row.isBreak && row.startTime >= '12:00');
		expect(afternoon).toBeDefined();
		expect(isTeachingSlotForExpandedRow({
			dayOfWeek: 'wednesday',
			row: afternoon!,
			halfDays: preset.halfDays,
		})).toBe(false);
		expect(isTeachingSlotForExpandedRow({
			dayOfWeek: 'monday',
			row: afternoon!,
			halfDays: preset.halfDays,
		})).toBe(true);
	});
});

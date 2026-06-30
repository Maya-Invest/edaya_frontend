import { describe, expect, it } from 'bun:test';
import { COMMON_TIMEZONES, ONBOARDING_COUNTRIES, optionsWithCurrent } from './school-step-defaults';

describe('optionsWithCurrent', () => {
	it('includes the browser timezone when it is not in the preset list', () => {
		const options = optionsWithCurrent(COMMON_TIMEZONES, 'America/Toronto');
		expect(options).toContain('America/Toronto');
	});

	it('does not duplicate values already in the list', () => {
		const options = optionsWithCurrent(ONBOARDING_COUNTRIES, 'France');
		expect(options.filter(entry => entry === 'France')).toHaveLength(1);
	});

	it('prepends a custom country value', () => {
		const options = optionsWithCurrent(ONBOARDING_COUNTRIES, 'Autre pays');
		expect(options[0]).toBe('Autre pays');
	});
});

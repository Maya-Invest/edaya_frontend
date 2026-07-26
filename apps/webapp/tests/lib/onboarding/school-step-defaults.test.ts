import { describe, expect, it } from 'bun:test';
import {
	COMMON_TIMEZONES,
	COUNTRY_DEFAULT_TIMEZONE,
	DEFAULT_ONBOARDING_COUNTRY,
	ONBOARDING_COUNTRIES,
	STRUCTURE_READY_COUNTRIES,
	isStructureReadyCountry,
	optionsWithCurrent,
	timezoneForCountry,
} from '$lib/onboarding/school-step-defaults';

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

describe('timezoneForCountry', () => {
	it('maps Côte d\'Ivoire to Africa/Abidjan', () => {
		expect(timezoneForCountry('Côte d\'Ivoire')).toBe('Africa/Abidjan');
	});

	it('maps France to Europe/Paris', () => {
		expect(timezoneForCountry('France')).toBe('Europe/Paris');
	});

	it('returns undefined for unknown countries', () => {
		expect(timezoneForCountry('Autre pays')).toBeUndefined();
	});

	it('covers every onboarding country with a listed timezone', () => {
		for (const country of ONBOARDING_COUNTRIES) {
			const timezone = COUNTRY_DEFAULT_TIMEZONE[country];
			expect(COMMON_TIMEZONES.includes(timezone as (typeof COMMON_TIMEZONES)[number])).toBe(true);
			expect(timezoneForCountry(country)).toBe(timezone);
		}
	});
});

describe('isStructureReadyCountry', () => {
	it('marks only Côte d\'Ivoire as structure-ready', () => {
		expect(DEFAULT_ONBOARDING_COUNTRY).toBe("Côte d'Ivoire");
		expect(STRUCTURE_READY_COUNTRIES).toEqual(["Côte d'Ivoire"]);
		expect(isStructureReadyCountry("Côte d'Ivoire")).toBe(true);
		expect(isStructureReadyCountry('France')).toBe(false);
		expect(isStructureReadyCountry('Sénégal')).toBe(false);
	});
});

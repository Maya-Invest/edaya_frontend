import { describe, expect, it } from 'bun:test';
import {
	COMMON_TIMEZONES,
	COUNTRY_DEFAULT_TIMEZONE,
	DEFAULT_ONBOARDING_COUNTRY,
	ONBOARDING_COUNTRIES,
	STRUCTURE_READY_COUNTRIES,
	academicYearLabelFromDates,
	defaultAcademicYearPreset,
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

describe('academicYearLabelFromDates', () => {
	it('joins civil years with a hyphen', () => {
		expect(academicYearLabelFromDates('2026-09-01', '2027-07-03')).toBe('2026-2027');
	});

	it('keeps identical years', () => {
		expect(academicYearLabelFromDates('2026-09-01', '2026-12-01')).toBe('2026-2026');
	});

	it('reads years from ISO timestamps', () => {
		expect(academicYearLabelFromDates('2025-09-01T12:00:00.000Z', '2026-07-03T12:00:00.000Z')).toBe(
			'2025-2026',
		);
	});

	it('returns an empty string when a date is missing or not a year', () => {
		expect(academicYearLabelFromDates('', '2027-07-03')).toBe('');
		expect(academicYearLabelFromDates('2026-09-01', '')).toBe('');
		expect(academicYearLabelFromDates('abcd-09-01', '2027-07-03')).toBe('');
	});
});

describe('defaultAcademicYearPreset', () => {
	it('labels the preset with derived civil years', () => {
		const preset = defaultAcademicYearPreset(new Date('2026-09-15T12:00:00'));
		expect(preset.start).toBe('2026-09-01');
		expect(preset.end).toBe('2027-07-03');
		expect(preset.label).toBe('2026-2027');
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

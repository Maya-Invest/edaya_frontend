export interface DefaultAcademicYearPreset {
	label: string;
	start: string;
	end: string;
}

const CIVIL_YEAR = /^\d{4}$/;

/** Display identity for an academic year, e.g. `2026-2027`. */
export function academicYearLabelFromDates(start: string, end: string): string {
	const startYear = start.trim().slice(0, 4);
	const endYear = end.trim().slice(0, 4);
	if (!CIVIL_YEAR.test(startYear) || !CIVIL_YEAR.test(endYear)) {
		return '';
	}
	return `${startYear}-${endYear}`;
}

export function defaultAcademicYearPreset(reference = new Date()): DefaultAcademicYearPreset {
	const month = reference.getMonth();
	const startYear = month >= 8 ? reference.getFullYear() : reference.getFullYear() - 1;
	const endYear = startYear + 1;
	const start = `${startYear}-09-01`;
	const end = `${endYear}-07-03`;
	return {
		label: academicYearLabelFromDates(start, end),
		start,
		end,
	};
}

export const ONBOARDING_COUNTRIES = [
	'France',
	'Belgique',
	'Suisse',
	'Canada',
	'Luxembourg',
	'Monaco',
	'Sénégal',
	'Côte d\'Ivoire',
	'Mali',
	'Cameroun',
	'Madagascar',
	'Maroc',
	'Tunisie',
	'Algérie',
	'Liban',
	'Haïti',
] as const;

/** Countries with structure templates available in onboarding (fixtures exist). */
export const DEFAULT_ONBOARDING_COUNTRY = 'Côte d\'Ivoire';

export const COMMON_TIMEZONES = [
	'Europe/Paris',
	'Europe/Brussels',
	'Europe/Zurich',
	'Europe/Luxembourg',
	'America/Montreal',
	'America/Toronto',
	'America/New_York',
	'America/Port-au-Prince',
	'America/Martinique',
	'America/Guadeloupe',
	'America/Cayenne',
	'Indian/Reunion',
	'Indian/Mayotte',
	'Indian/Antananarivo',
	'Africa/Abidjan',
	'Africa/Dakar',
	'Africa/Douala',
	'Africa/Casablanca',
	'Africa/Tunis',
	'Africa/Algiers',
	'Asia/Beirut',
] as const;

/** Default IANA timezone for each onboarding country option. */
export const COUNTRY_DEFAULT_TIMEZONE: Record<(typeof ONBOARDING_COUNTRIES)[number], string> = {
	'France': 'Europe/Paris',
	'Belgique': 'Europe/Brussels',
	'Suisse': 'Europe/Zurich',
	'Canada': 'America/Toronto',
	'Luxembourg': 'Europe/Luxembourg',
	'Monaco': 'Europe/Paris',
	'Sénégal': 'Africa/Dakar',
	'Côte d\'Ivoire': 'Africa/Abidjan',
	'Mali': 'Africa/Abidjan',
	'Cameroun': 'Africa/Douala',
	'Madagascar': 'Indian/Antananarivo',
	'Maroc': 'Africa/Casablanca',
	'Tunisie': 'Africa/Tunis',
	'Algérie': 'Africa/Algiers',
	'Liban': 'Asia/Beirut',
	'Haïti': 'America/Port-au-Prince',
};

export function timezoneForCountry(country: string): string | undefined {
	const trimmed = country.trim();
	if (!trimmed) {
		return undefined;
	}
	return COUNTRY_DEFAULT_TIMEZONE[trimmed as keyof typeof COUNTRY_DEFAULT_TIMEZONE];
}

export function optionsWithCurrent<T extends string>(
	options: readonly T[],
	current: string,
): string[] {
	const trimmed = current.trim();
	if (!trimmed || options.includes(trimmed as T)) {
		return [...options];
	}
	return [trimmed as T, ...options];
}

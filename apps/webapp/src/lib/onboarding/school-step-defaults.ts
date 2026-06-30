export interface DefaultAcademicYearPreset {
	label: string;
	start: string;
	end: string;
}

export function defaultAcademicYearPreset(reference = new Date()): DefaultAcademicYearPreset {
	const month = reference.getMonth();
	const startYear = month >= 8 ? reference.getFullYear() : reference.getFullYear() - 1;
	const endYear = startYear + 1;
	return {
		label: `${startYear} — ${endYear}`,
		start: `${startYear}-09-01`,
		end: `${endYear}-07-03`,
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

export const COMMON_TIMEZONES = [
	'Europe/Paris',
	'Europe/Brussels',
	'Europe/Zurich',
	'Europe/Luxembourg',
	'America/Montreal',
	'America/Toronto',
	'America/New_York',
	'America/Martinique',
	'America/Guadeloupe',
	'America/Cayenne',
	'Indian/Reunion',
	'Indian/Mayotte',
	'Africa/Abidjan',
	'Africa/Dakar',
	'Africa/Casablanca',
	'Africa/Tunis',
	'Africa/Algiers',
] as const;

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

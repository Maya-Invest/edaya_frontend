/**
 * Canonical key for matching niveau values in imports against school grade level names.
 * Accepts QA style (`6eme`), wizard style (`6ème`), series (`Seconde A`), and legacy names (`Sixième`).
 */
export function normalizeGradeLevelImportKey(value: string): string {
	const key = value
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/\s+/g, ' ');

	const aliases: Record<string, string> = {
		'sixieme': '6eme',
		'6e': '6eme',
		'6eme': '6eme',
		'cinquieme': '5eme',
		'5e': '5eme',
		'5eme': '5eme',
		'quatrieme': '4eme',
		'4e': '4eme',
		'4eme': '4eme',
		'troisieme': '3eme',
		'3e': '3eme',
		'3eme': '3eme',
		'2nda': '2nda',
		'2ndc': '2ndc',
		'2nde a': '2nda',
		'2nde c': '2ndc',
		'seconde a': '2nda',
		'seconde c': '2ndc',
		'1era': '1era',
		'1erc': '1erc',
		'1erd': '1erd',
		'1ere a': '1era',
		'1ere c': '1erc',
		'1ere d': '1erd',
		'premiere a': '1era',
		'premiere c': '1erc',
		'premiere d': '1erd',
		'tlea': 'tlea',
		'tlec': 'tlec',
		'tled': 'tled',
		'tle a': 'tlea',
		'tle c': 'tlec',
		'tle d': 'tled',
		'terminale a': 'tlea',
		'terminale c': 'tlec',
		'terminale d': 'tled',
	};

	return aliases[key] ?? key;
}

/**
 * Canonical key for matching niveau values in imports against school grade level names.
 * Accepts QA style (`6eme`), wizard style (`6ème`), and legacy fixture names (`Sixième`).
 */
export function normalizeGradeLevelImportKey(value: string): string {
	let key = value
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/\s+/g, ' ');

	const aliases: Record<string, string> = {
		'sixieme': '6eme',
		'6e': '6eme',
		'cinquieme': '5eme',
		'5e': '5eme',
		'quatrieme': '4eme',
		'4e': '4eme',
		'troisieme': '3eme',
		'3e': '3eme',
		'2nde': '2nde',
		'seconde': '2nde',
		'seconde a': '2nda',
		'seconde c': '2ndc',
		'1ere': '1ere',
		'premiere': '1ere',
		'premiere a': '1era',
		'premiere c': '1erc',
		'premiere d': '1erd',
		'terminale': 'terminale',
		'terminale a': 'tlea',
		'terminale c': 'tlec',
		'terminale d': 'tled',
	};

	return aliases[key] ?? key;
}

/** Visible defaults only; the server remains authoritative for normalization and validation. */
export function suggestShortName(name: string): string {
	const normalized = name.normalize('NFC').trim().replace(/[\p{Zs}\t]+/gu, ' ');
	return Array.from(new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(normalized), part => part.segment).slice(0, 32).join('').trim();
}

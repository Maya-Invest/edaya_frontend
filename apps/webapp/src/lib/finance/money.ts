const FALLBACK_FRACTION_DIGITS = 0;

export function currencyFractionDigits(currency: string, locale = 'fr-FR'): number {
	const code = currency.trim().toUpperCase();
	if (!code) {
		return FALLBACK_FRACTION_DIGITS;
	}
	try {
		const digits = new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: code,
		}).resolvedOptions().maximumFractionDigits;
		return typeof digits === 'number' ? digits : FALLBACK_FRACTION_DIGITS;
	}
	catch {
		return FALLBACK_FRACTION_DIGITS;
	}
}

export function minorToMajor(amountMinor: number, currency: string, locale = 'fr-FR'): number {
	const digits = currencyFractionDigits(currency, locale);
	return amountMinor / 10 ** digits;
}

export function majorToMinor(amountMajor: number, currency: string, locale = 'fr-FR'): number {
	const digits = currencyFractionDigits(currency, locale);
	return Math.round(amountMajor * 10 ** digits);
}

export function formatMinorUnits(
	amountMinor: number,
	currency: string,
	locale = 'fr-FR',
): string {
	const code = currency.trim().toUpperCase();
	if (!code)
		return '—';
	const major = minorToMajor(amountMinor, code, locale);
	try {
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: code,
		}).format(major);
	}
	catch {
		return `${major.toLocaleString(locale)} ${code}`;
	}
}

export function parseMajorInput(value: string | number | null | undefined): number | null {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : null;
	}
	if (typeof value !== 'string') {
		return null;
	}
	const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
	if (!normalized) {
		return null;
	}
	const parsed = Number.parseFloat(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

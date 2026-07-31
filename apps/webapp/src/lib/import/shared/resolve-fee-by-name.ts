export interface FeeNameLookupOption {
	id: string;
	name: string;
}

function normalizeLookupValue(value: string): string {
	return value.trim().toLowerCase();
}

export function resolveFeeIdByName(
	feeName: string,
	fees: readonly FeeNameLookupOption[],
): { feeId?: string; suggestions?: string[] } {
	const key = normalizeLookupValue(feeName);
	const matches = fees.filter(fee => normalizeLookupValue(fee.name) === key);
	if (matches.length === 1) {
		return { feeId: matches[0]?.id };
	}

	const suggestions = fees
		.map(fee => fee.name)
		.filter((name) => {
			const normalized = normalizeLookupValue(name);
			return normalized.includes(key) || key.includes(normalized);
		})
		.slice(0, 5);

	return {
		suggestions: suggestions.length > 0 ? suggestions : fees.slice(0, 5).map(fee => fee.name),
	};
}

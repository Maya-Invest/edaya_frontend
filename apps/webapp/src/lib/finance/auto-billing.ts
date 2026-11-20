import type { AutoBillingConfiguration } from '$lib/api/finance-types';

/** Absent settings are manual; malformed settings must not appear as safely disabled. */
export function parseAutoBilling(value: unknown): AutoBillingConfiguration {
	if (value === undefined || value === null)
		return { mode: 'off' };
	if (typeof value !== 'object')
		throw new Error('Invalid auto billing configuration');
	const record = value as Record<string, unknown>;
	if (record.mode === 'off' || record.mode === 'all')
		return { mode: record.mode };
	const selection = (input: unknown): input is string[] | null => input === null || (Array.isArray(input) && input.length > 0 && input.every(id => typeof id === 'string' && id.trim().length > 0) && new Set(input).size === input.length);
	if (record.mode === 'matching' && selection(record.gradeLevelIds) && selection(record.placementStatusIds))
		return { mode: 'matching', gradeLevelIds: record.gradeLevelIds, placementStatusIds: record.placementStatusIds };
	throw new Error('Invalid auto billing configuration');
}

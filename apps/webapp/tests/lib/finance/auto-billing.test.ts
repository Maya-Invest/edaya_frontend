import { expect, test } from 'bun:test';
import { parseAutoBilling } from '../../../src/lib/finance/auto-billing';

test('auto billing parsing preserves explicit all selectors and defaults only absent settings to off', () => {
	expect(parseAutoBilling(undefined)).toEqual({ mode: 'off' });
	expect(parseAutoBilling({ mode: 'all' })).toEqual({ mode: 'all' });
	expect(parseAutoBilling({ mode: 'matching', gradeLevelIds: ['grade'], placementStatusIds: null })).toEqual({ mode: 'matching', gradeLevelIds: ['grade'], placementStatusIds: null });
	for (const invalid of [{ mode: 'mandatory' }, { mode: 'matching', gradeLevelIds: [], placementStatusIds: null }, { mode: 'matching', gradeLevelIds: null, placementStatusIds: ['same', 'same'] }])
		expect(() => parseAutoBilling(invalid)).toThrow();
});

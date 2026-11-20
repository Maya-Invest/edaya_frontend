import { expect, test } from 'bun:test';
import { formatLocaleTimestamp } from '../../../src/lib/date/format';
test('audit timestamps preserve the instant instead of replacing its time with noon', () => {
 const value = formatLocaleTimestamp('2026-10-25T15:37:00Z', 'en-US', { timeZone: 'UTC', hour12: false });
 expect(value).toContain('15:37'); expect(value).toContain('UTC');
 expect(formatLocaleTimestamp('2026-10-25T11:37:00-04:00', 'en-US', { timeZone: 'UTC', hour12: false })).toBe(value);
 for (const missing of [null, undefined, '2026-10-25', 'invalid', '2026-10-25T15:37:00', {}]) expect(formatLocaleTimestamp(missing, 'en')).toBeNull();
});

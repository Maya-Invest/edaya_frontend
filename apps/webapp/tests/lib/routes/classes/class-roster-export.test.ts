import { expect, test } from 'bun:test';
import { ClassRosterExport } from '../../../../src/routes/(app)/classes/[classId]/students/lib/class-roster-export';

test('retry reuses the uncertain identity and skips cards already accepted for the selection', async () => {
	const state = new ClassRosterExport();
	const studentIds = Array.from({ length: 61 }, (_, index) => String(index));
	const selection = { classId: 'class', studentIds, key: 'school/year/class', assertCurrent() {} };
	const rosterIds: string[] = [];
	const batches: { studentId: string; requestId: string }[][] = [];
	let attempts = 0;
	const documents = {
		roster: async (id: string) => { rosterIds.push(id); return true; },
		cards: async (items: { studentId: string; requestId: string }[]) => {
			batches.push(items);
			attempts++;
			if (attempts === 2) return null;
			return { items: items.map(({ studentId }) => ({
				sourceId: studentId,
				issuanceId: attempts === 1 && studentId === '0' ? undefined : 'card-' + studentId,
			})) };
		},
	};
	await state.request(selection, documents);
	expect(await state.request(selection, documents)).toBe(0);
	expect(rosterIds).toHaveLength(1);
	expect(batches.map(batch => batch.length)).toEqual([50, 11, 12]);
	expect(batches[2]).toEqual([batches[0]![0]!, ...batches[1]!]);
});

test('a scope change stops the unsent batch', async () => {
	const state = new ClassRosterExport();
	let current = true;
	let cards = 0;
	const request = state.request({
		key: 'school-a', classId: 'class', studentIds: Array.from({ length: 51 }, (_, i) => String(i)),
		assertCurrent() { if (!current) throw new DOMException('Selection changed', 'AbortError'); },
	}, {
		roster: async () => true,
		cards: async items => {
			cards += items.length;
			current = false;
			return { items: items.map(item => ({ sourceId: item.sourceId, issuanceId: item.requestId })) };
		},
	});
	await expect(request).rejects.toThrow('Selection changed');
	expect(cards).toBe(50);
});

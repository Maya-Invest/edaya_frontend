import { describe, expect, it } from 'bun:test';

// Mirror of appendUniqueById from use-infinite-list.svelte.ts for unit testing.
function hasStringId(value: unknown): value is { id: string } {
	return typeof value === 'object' && value !== null && typeof (value as { id?: unknown }).id === 'string';
}

function appendUniqueById<T>(existing: readonly T[], incoming: readonly T[]): T[] {
	if (existing.length === 0) {
		return [...incoming];
	}
	if (!hasStringId(existing[0]) || !incoming.every(hasStringId)) {
		return [...existing, ...incoming];
	}

	const identifiedExisting = existing as ReadonlyArray<T & { id: string }>;
	const identifiedIncoming = incoming as ReadonlyArray<T & { id: string }>;
	const seen: Record<string, true> = Object.create(null);
	for (const item of identifiedExisting) {
		seen[item.id] = true;
	}
	const merged = [...existing];
	for (const item of identifiedIncoming) {
		if (!seen[item.id]) {
			seen[item.id] = true;
			merged.push(item);
		}
	}
	return merged;
}

describe('appendUniqueById', () => {
	it('drops duplicate ids when appending paginated pages', () => {
		const first = [{ id: 'g1' }, { id: 'g282' }];
		const second = [{ id: 'g282' }, { id: 'g3' }];
		expect(appendUniqueById(first, second)).toEqual([{ id: 'g1' }, { id: 'g282' }, { id: 'g3' }]);
	});
});

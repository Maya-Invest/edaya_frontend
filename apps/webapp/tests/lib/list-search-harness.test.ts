import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const LIST_SEARCH_FIELD = path.join(
	import.meta.dirname,
	'../../src/lib/components/ui/ListSearchField.svelte',
);

describe('list search harness contract', () => {
	it('ListSearchField exposes data-testid="list-search"', () => {
		const source = readFileSync(LIST_SEARCH_FIELD, 'utf-8');
		expect(source).toContain('data-testid="list-search"');
	});
});

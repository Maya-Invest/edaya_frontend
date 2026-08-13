import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const inventorySource = readFileSync(
	new URL('../../scripts/generate-frontend-routes-inventory.ts', import.meta.url),
	'utf8',
);

describe('frontend routes inventory compatibility routes', () => {
	it('registers teacher assignments compatibility routing', () => {
		const route = '/school/teacher-assignments';
		expect(inventorySource).toContain(
			`'${route}': '/configuration/tools/teacher-assignments'`,
		);
		expect(inventorySource.match(new RegExp(`'${route}'`, 'g'))).toHaveLength(3);
	});

	it('registers subject level compatibility routing', () => {
		const route = '/configuration/subjects/level/:level?';
		expect(inventorySource).toContain(
			`'${route}': '/configuration/subjects?gradeLevel=:level'`,
		);
		expect(inventorySource.match(new RegExp(route.replace('?', '\\?'), 'g'))).toHaveLength(3);
	});
});

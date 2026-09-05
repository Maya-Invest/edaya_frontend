import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TESTS_LIB_ROOT = import.meta.dir;

const FORBIDDEN_BACKEND_PATH = 'edaya_backend';
const FORBIDDEN_EAGER_RUN_MUTATION = 'typeof import(';
const FORBIDDEN_STATIC_IMPORT = /^\s*import\s+(?!type\s)[^;]*from\s+['"]([^'"]+)['"]/gm;
const FORBIDDEN_SPECIFIER = /\.svelte(?:\.ts)?$|\/run-mutation(?:\.ts)?$|\/toast\.svelte|\/session\.svelte|\/entity-versions\.svelte/;

function walkTestFiles(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...walkTestFiles(path));
			continue;
		}
		if (entry.name.endsWith('.test.ts') && entry.name !== 'ci-parity-guard.test.ts') {
			files.push(path);
		}
	}
	return files;
}

describe('CI parity guard', () => {
	const files = walkTestFiles(TESTS_LIB_ROOT);

	it('does not read a sibling backend checkout from unit tests', () => {
		const offenders = files.filter(file => readFileSync(file, 'utf8').includes(FORBIDDEN_BACKEND_PATH));
		expect(offenders).toEqual([]);
	});

	it('does not eagerly type-import run-mutation before mocks', () => {
		const offenders = files.filter((file) => {
			const source = readFileSync(file, 'utf8');
			return source.includes(FORBIDDEN_EAGER_RUN_MUTATION) && source.includes('run-mutation');
		});
		expect(offenders).toEqual([]);
	});

	it('does not statically import Svelte state or run-mutation modules', () => {
		const offenders: string[] = [];
		for (const file of files) {
			const source = readFileSync(file, 'utf8');
			for (const match of source.matchAll(FORBIDDEN_STATIC_IMPORT)) {
				const specifier = match[1] ?? '';
				if (FORBIDDEN_SPECIFIER.test(specifier)) {
					offenders.push(`${file}: ${specifier}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});
});

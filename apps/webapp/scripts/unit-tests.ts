import { resolve } from 'node:path';

/** Isolate library module mocks and run state suites with their own compiler plugins. */
export function unitInvocations(root: string): string[][] {
	const files = [...new Bun.Glob('tests/unit/**/*.test.ts').scanSync({ cwd: root })].sort();
	if (!files.length) throw new Error('No isolated unit suites discovered');
	return [['test', '--isolate', 'tests/lib'], ...files.map(file => ['test', file])];
}

if (import.meta.main) {
	const root = resolve(import.meta.dirname, '..');
	let failed = false;
	for (const args of unitInvocations(root)) {
		const child = Bun.spawn([process.execPath, ...args], {
			cwd: root, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit',
		});
		if (await child.exited !== 0) failed = true;
	}
	process.exitCode = failed ? 1 : 0;
}

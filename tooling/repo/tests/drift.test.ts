import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'bun:test'
import { findDriftedArtifacts } from '../lib/drift.ts'

describe('findDriftedArtifacts', () => {
	const temporaryDirectories: string[] = []

	afterEach(() => {
		for (const directory of temporaryDirectories.splice(0)) {
			rmSync(directory, { recursive: true, force: true })
		}
	})

	function createPaths(): { root: string, generated: string, tracked: string } {
		const root = mkdtempSync(join(tmpdir(), 'edaya-web-generated-test-'))
		temporaryDirectories.push(root)
		return {
			root,
			generated: join(root, 'generated.txt'),
			tracked: join(root, 'tracked.txt'),
		}
	}

	test('accepts byte-identical generated and tracked files', () => {
		const paths = createPaths()
		writeFileSync(paths.generated, 'same bytes')
		writeFileSync(paths.tracked, 'same bytes')

		expect(findDriftedArtifacts([paths], paths.root)).toEqual([])
	})

	test('reports changed generated output using its tracked path', () => {
		const paths = createPaths()
		writeFileSync(paths.generated, 'new bytes')
		writeFileSync(paths.tracked, 'committed bytes')

		expect(findDriftedArtifacts([paths], paths.root)).toEqual(['tracked.txt'])
	})

	test('reports drift when generated output is missing', () => {
		const paths = createPaths()
		writeFileSync(paths.tracked, 'committed bytes')

		expect(findDriftedArtifacts([paths], paths.root)).toEqual(['tracked.txt'])
	})
})

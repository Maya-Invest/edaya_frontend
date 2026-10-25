import { Buffer } from 'node:buffer'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { brandGallery, contrast, tokenCss } from '../brand'
import { root, run } from '../runtime'

test('brand generation retains committed token values', () => {
  const actual = readFileSync(resolve(root, 'apps/webapp/src/lib/design-system/tokens.css'), 'utf8')
  expect(tokenCss(JSON.parse(readFileSync(resolve(root, 'design-system/tokens.json'), 'utf8')))).toBe(actual)
  expect(contrast('#ffffff', '#000000')).toBe(21)
  expect(contrast('#aaaaaa', '#aaaaaa')).toBe(1)
})

test('review gallery reports missing captures without creating documentation', async () => {
  const repository = mkdtempSync(resolve(tmpdir(), 'edaya-empty-gallery-'))
  try {
    await expect(brandGallery(repository)).rejects.toThrow('No review screenshots')
    expect(existsSync(resolve(repository, 'docs'))).toBe(false)
    expect(existsSync(resolve(repository, 'apps'))).toBe(false)
  }
  finally { rmSync(repository, { recursive: true, force: true }) }
})

test('review gallery uses ignored outputs and retains matching capture provenance', async () => {
  const repository = mkdtempSync(resolve(tmpdir(), 'edaya-review-gallery-'))
  const directory = resolve(repository, 'apps/webapp/.screenshots/design-review')
  try {
    for (const path of ['apps/webapp/src', 'apps/webapp/static', 'design-system', 'apps/webapp/.screenshots/design-review/current'])
      mkdirSync(resolve(repository, path), { recursive: true })
    writeFileSync(resolve(repository, 'design-system/tokens.json'), JSON.stringify({ version: '1.0.0' }))
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64')
    writeFileSync(resolve(directory, 'current/example-phone-fr.png'), png)
    await run(['git', 'init', '-q'], { cwd: repository, quiet: true })
    await run(['git', '-c', 'user.name=Gallery test', '-c', 'user.email=gallery@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-qm', 'Fixture'], { cwd: repository, quiet: true })
    await brandGallery(repository)
    const manifestFile = resolve(directory, 'manifest.json')
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'))
    expect(manifest.captures).toHaveLength(1)
    expect(manifest.captures[0].file).toBe('current/example-phone-fr.png')
    expect(manifest.captures[0].imagePixels).toEqual({ width: 1, height: 1 })
    expect(readFileSync(resolve(directory, 'index.html'), 'utf8')).toContain('current/example-phone-fr.png')
    expect(existsSync(resolve(repository, 'docs'))).toBe(false)
    manifest.captures[0].sourceRevision = 'original-capture-revision'
    manifest.captures[0].capturedAt = '2026-01-01T00:00:00Z'
    writeFileSync(manifestFile, JSON.stringify(manifest))
    await brandGallery(repository)
    const regenerated = JSON.parse(readFileSync(manifestFile, 'utf8'))
    expect(regenerated.captures[0].sourceRevision).toBe('original-capture-revision')
    expect(regenerated.captures[0].capturedAt).toBe('2026-01-01T00:00:00Z')
    writeFileSync(resolve(directory, 'current/invalid.png'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    await expect(brandGallery(repository)).rejects.toThrow('Invalid PNG')
    expect(readFileSync(manifestFile, 'utf8')).toBe(`${JSON.stringify(regenerated, null, 2)}\n`)
  }
  finally { rmSync(repository, { recursive: true, force: true }) }
})

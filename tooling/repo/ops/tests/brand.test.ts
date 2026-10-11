import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'bun:test'
import { contrast, tokenCss } from '../brand'
import { root } from '../runtime'

test('brand generation retains committed token values', () => {
  const actual = readFileSync(resolve(root, 'apps/webapp/src/lib/design-system/tokens.css'), 'utf8')
  expect(tokenCss(JSON.parse(readFileSync(resolve(root, 'design-system/tokens.json'), 'utf8')))).toBe(actual)
  expect(contrast('#ffffff', '#000000')).toBe(21)
  expect(contrast('#aaaaaa', '#aaaaaa')).toBe(1)
})

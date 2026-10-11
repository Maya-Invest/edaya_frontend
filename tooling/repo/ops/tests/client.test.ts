import { expect, test } from 'bun:test'
import { clientOptions } from '../client'

test('explicit client acquisition options reject ambiguous inputs', () => {
  expect(clientOptions([])).toEqual({ target: 'staging' })
  expect(clientOptions(['production', '--backend-root', '/tmp/backend'])).toEqual({ target: 'production', backendRoot: '/tmp/backend' })
  for (const args of [['feature'], ['staging', '--ref'], ['staging', '--ref', 'main', '--backend-root', '/tmp/backend'], ['staging', '--unknown', 'main']])
    expect(() => clientOptions(args)).toThrow()
})

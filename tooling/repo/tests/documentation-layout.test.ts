import { expect, test } from 'bun:test'
import { documentationLayoutIssues, normativeSpecs } from '../lib/documentation-layout'

test('specs and colocated READMEs form the maintained documentation layout', () => {
  expect(documentationLayoutIssues([...normativeSpecs, 'README.MD', 'apps/webapp/README.md', 'tooling/repo/README.md'])).toEqual([])
})

test('missing specs and new historical documents fail the layout check', () => {
  const paths = [...normativeSpecs.slice(1), 'docs/sprints/new-plan.md', 'docs/specs/audit.md']
  expect(documentationLayoutIssues(paths)).toEqual([
    `Missing normative spec: ${normativeSpecs[0]}`,
    'Unexpected documentation: docs/sprints/new-plan.md; keep engineering guidance in READMEs and historical material outside the repository',
    'Unexpected documentation: docs/specs/audit.md; keep engineering guidance in READMEs and historical material outside the repository',
  ])
})

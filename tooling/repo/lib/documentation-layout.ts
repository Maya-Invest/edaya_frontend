export const normativeSpecs = [
  'app-shell-spec.md',
  'design-language-spec.md',
  'documentation-spec.md',
  'feature-architecture-spec.md',
  'route-state-spec.md',
  'shared-components-spec.md',
].map(name => `docs/specs/${name}`)

/** Receives existing tracked and unignored files, including newly added documents. */
export function documentationLayoutIssues(paths: readonly string[]): string[] {
  const actual = new Set(paths.filter(path => path.startsWith('docs/')))
  return [
    ...normativeSpecs.filter(path => !actual.has(path)).map(path => `Missing normative spec: ${path}`),
    ...[...actual].filter(path => !normativeSpecs.includes(path)).map(path => `Unexpected documentation: ${path}; keep engineering guidance in READMEs and historical material outside the repository`),
  ]
}

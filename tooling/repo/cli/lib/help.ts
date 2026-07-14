export function repoCliUsage(): string {
  return [
    'Usage: bun repo <command> [options]',
    '',
    'Validation:',
    '  doctor                       Repo hygiene (env files, materialize .env)',
    '  verify                       Repo hygiene (no Turbo — use bun run verify)',
    '',
    'Operations:',
    '  smoke-test staging           HTTP smoke against staging SPA shells',
    '',
    'Examples:',
    '  bun repo smoke-test staging',
    '  bun repo verify',
  ].join('\n')
}

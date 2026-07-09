export function repoCliUsage(): string {
  return [
    'Usage: bun repo <command> [options]',
    '',
    'Validation:',
    '  doctor                       Repo hygiene (env files, materialize .env)',
    '  verify                       Repo hygiene (no Turbo — use bun run verify)',
    '  check openapi|openapi-export OpenAPI drift checks',
    '',
    'OpenAPI:',
    '  openapi export|generate      Export spec or regenerate client artifacts',
    '',
    'Operations:',
    '  smoke-test staging           HTTP smoke against staging SPA shells',
    '',
    'Examples:',
    '  bun repo check openapi',
    '  bun repo openapi generate',
    '  bun repo smoke-test staging',
    '  bun repo verify',
  ].join('\n')
}

# Isolated unit suites

Place frontend state/controller tests here when they install global `mock.module` replacements or Svelte rune compiler plugins. `bun scripts/unit-tests.ts` discovers every `*.test.ts` recursively, runs shared tests under `tests/lib` first, then runs each state suite in a separate Bun process. A failure in any process fails the command.

These suites use mocked dependencies and require no backend service or Chromium. Use `tests/lib` for shared helper and route-state tests that can safely run together. Test production implementations and preserve mutation identity, stale-response rejection, dirty-state guards and authoritative server-result handling.

Keep browser-dependent focus, keyboard, layout and event-binding assertions in supervised integration journeys. Server-rendering tests establish rendered content only; they do not establish hydration or browser behavior.

`bun repo test unit` at the repository root runs all workspace tests, including tooling once, without Turbo test-result reuse. `bun run test` may use local Turbo caching.

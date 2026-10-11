import { run } from './runtime'

await run(['git', 'config', 'core.hooksPath', '.githooks'], { quiet: true })

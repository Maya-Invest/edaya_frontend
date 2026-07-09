import { paths } from '../lib/paths'
import { runBunScript, runRepoCommand } from '../lib/spawn'

interface VerifyStep {
  label: string
  run: () => Promise<number>
}

const VERIFY_STEPS: VerifyStep[] = [
  { label: 'repo doctor', run: () => runBunScript(paths.doctor) },
  { label: 'repo check openapi', run: () => runBunScript(paths.openapiCheck) },
  {
    label: 'repo tests',
    run: () => runRepoCommand(['bun', 'test', 'tests', '--dots'], { cwd: paths.repoPackageRoot }),
  },
]

export async function runVerify(): Promise<number> {
  for (const step of VERIFY_STEPS) {
    const exitCode = await step.run()
    if (exitCode !== 0) {
      console.error(`verify failed at: ${step.label}`)
      return exitCode
    }
  }
  return 0
}

export function verifyCliUsage(): string {
  return [
    'Usage: bun repo verify',
    '',
    'Repo hygiene checks (no Turbo). Root `bun run verify` runs this first, then turbo quality/build/test:',
    ...VERIFY_STEPS.map((step, index) => `  ${index + 1}. ${step.label}`),
  ].join('\n')
}

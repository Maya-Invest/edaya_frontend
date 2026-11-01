import type { StageEvidence } from './qualification'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { recordStage, stageContext, validateStageEvidence } from './qualification'
import { files, root, writeJson } from './runtime'

export const qualityParts = ['checks', 'lint', 'types'] as const
export function resetQuality(): void {
  rmSync(resolve(root, '.ci-evidence/quality'), { force: true, recursive: true })
  rmSync(resolve(root, '.ci-evidence/stages/quality.json'), { force: true })
}
export async function finalizeQuality(): Promise<void> {
  let reports: StageEvidence[] = []
  try {
    await recordStage('quality', async () => {
      reports = files(resolve(root, '.ci-evidence/quality')).filter(path => path.endsWith('.json')).map(path => JSON.parse(readFileSync(path, 'utf8')) as StageEvidence)
      validateStageEvidence(reports, await stageContext(), qualityParts)
    })
  }
  finally {
    const path = resolve(root, '.ci-evidence/stages/quality.json')
    if (existsSync(path)) {
      const record = JSON.parse(readFileSync(path, 'utf8')) as StageEvidence
      record.durationMs = reports.reduce((sum, part) => sum + (Number.isFinite(part.durationMs) && part.durationMs >= 0 ? part.durationMs : 0), 0)
      writeJson(path, record)
    }
  }
}

/**
 * Compatibility wrapper — debug scripts still call runWebTenantSetup.
 * Canonical provisioned path uses runUiJourney via qa-matrix-run.ts.
 */
import { readFile } from 'node:fs/promises';
import type { DemoContext } from '../demo-dry-run/support/types';
import { QA_TEMPLATE_MATRIX_RUNNABLE } from '../../../scripts/qa-template-matrix';
import type { MatrixEntities } from '../../../scripts/qa-matrix-support';
import { ENTITIES_PATH, runUiJourney } from './ui-flow-runner';
import type { SetupStepResult } from './journey-context';

export { ENTITIES_PATH } from './ui-flow-runner';
export type { SetupStepResult } from './journey-context';

export interface WebSetupResult {
	steps: SetupStepResult[];
	entities: MatrixEntities;
}

export async function runWebTenantSetup(ctx: DemoContext): Promise<WebSetupResult> {
	const journey = await runUiJourney(ctx, QA_TEMPLATE_MATRIX_RUNNABLE);
	return { steps: journey.steps, entities: journey.entities };
}

export async function loadSetupEntities(): Promise<Partial<MatrixEntities>> {
	try {
		const raw = await readFile(ENTITIES_PATH, 'utf8');
		const parsed = JSON.parse(raw) as { entities?: MatrixEntities };
		return parsed.entities ?? {};
	}
	catch {
		return {};
	}
}

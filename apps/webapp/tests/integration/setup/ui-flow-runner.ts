/**
 * Owner UI journey — one Playwright session, seed order as dependency spine,
 * each action recorded against the QA matrix ledger (no duplicate replay).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DemoContext } from '../demo-dry-run/support/types';
import type { QaTemplateRow } from '../../../scripts/qa-template-matrix.manual';
import type { MatrixEntities, MatrixResult } from '../../../scripts/qa-matrix-support';
import { createUiJourney, type SetupStepResult, type UiJourney } from './journey-context';
import { runStructureChapter } from './chapters/structure';
import { runConfigurationChapter } from './chapters/configuration';
import { runPeopleChapter } from './chapters/people';
import { runSchoolChapter } from './chapters/school';
import { runTeachingChapter } from './chapters/teaching';
import { runClassesFinanceChapter } from './chapters/classes-finance';

const WEBAPP_DIR = path.join(import.meta.dirname, '../../..');
export const ENTITIES_PATH = path.join(WEBAPP_DIR, '.integration-run', 'entities.json');

export interface UiJourneyResult {
	steps: SetupStepResult[];
	entities: MatrixEntities;
	results: MatrixResult[];
	structureOk: boolean;
	ledger: UiJourney['ledger'];
}

export async function runUiJourney(
	ctx: DemoContext,
	matrix: readonly QaTemplateRow[],
	onRecord: (result: MatrixResult) => void = () => {},
): Promise<UiJourneyResult> {
	const journey = createUiJourney(ctx, matrix, onRecord);
	journey.entities.onboarded = true;

	console.log('\n=== UI journey (owner session) ===');
	const structureOk = await runStructureChapter(journey);
	if (!structureOk) {
		console.error('Journey fail-fast: school structure incomplete');
	}
	else {
		await runConfigurationChapter(journey);
		await runPeopleChapter(journey);
		await runSchoolChapter(journey);
		await runTeachingChapter(journey);
		await runClassesFinanceChapter(journey);
	}

	await mkdir(path.dirname(ENTITIES_PATH), { recursive: true });
	await writeFile(ENTITIES_PATH, JSON.stringify({
		steps: journey.steps,
		entities: journey.entities,
		generatedAt: new Date().toISOString(),
	}, null, 2));

	return {
		steps: journey.steps,
		entities: journey.entities,
		results: journey.ledger.results(),
		structureOk,
		ledger: journey.ledger,
	};
}

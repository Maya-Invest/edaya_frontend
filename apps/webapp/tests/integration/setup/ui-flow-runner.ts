/**
 * Owner UI journey — one Playwright session, seed order as dependency spine,
 * each action recorded against the QA matrix ledger (no duplicate replay).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
import { runAccountsChapter } from './chapters/accounts';

const WEBAPP_DIR = path.join(import.meta.dirname, '../../..');
export const ENTITIES_PATH = path.join(WEBAPP_DIR, '.integration-run', 'entities.json');

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

async function runJourneyChapter(name: string, run: () => Promise<void>): Promise<void> {
	try {
		await run();
	}
	catch (err) {
		console.error(`Journey chapter "${name}" failed:`, err instanceof Error ? err.message : err);
	}
}

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
		await runJourneyChapter('configuration', () => runConfigurationChapter(journey));
		await runJourneyChapter('people', () => runPeopleChapter(journey));
		await runJourneyChapter('school', () => runSchoolChapter(journey));
		await runJourneyChapter('teaching', () => runTeachingChapter(journey));
		await runJourneyChapter('classes-finance', () => runClassesFinanceChapter(journey));
		await runJourneyChapter('accounts', () => runAccountsChapter(journey));
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

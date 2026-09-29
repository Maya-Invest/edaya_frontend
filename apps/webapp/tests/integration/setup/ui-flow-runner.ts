import { redactDiagnostic } from '../support/scenario-registry';
import { createRequiredReadFixtures } from './required-read-fixtures';
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
import { runFamilyFeedbackChapter } from './chapters/family-feedback';
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

async function runJourneyChapter(journey: UiJourney, name: string, run: () => Promise<void>): Promise<void> {
	try {
		await run();
	}
	catch (err) {
		const detail = redactDiagnostic(err instanceof Error ? err.message : String(err));
        console.error(`Journey chapter "${name}" failed:`, detail);
        await journey.ctx.shot(`failure-setup-${name}`).catch(() => {});
		journey.steps.push({ step: name, ok: false, detail });
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
	try {
		const structureOk = await runStructureChapter(journey);
		if (!structureOk) {
			throw new Error('Journey fail-fast: school structure incomplete');
		}
		await runJourneyChapter(journey, 'configuration', () => runConfigurationChapter(journey));
		await runJourneyChapter(journey, 'people', () => runPeopleChapter(journey));
		await runJourneyChapter(journey, 'school', () => runSchoolChapter(journey));
		await runJourneyChapter(journey, 'teaching', () => runTeachingChapter(journey));
		await runJourneyChapter(journey, 'required-read-fixtures', () => createRequiredReadFixtures(journey));
		await runJourneyChapter(journey, 'family-feedback', () => runFamilyFeedbackChapter(journey));
		await runJourneyChapter(journey, 'classes-finance', () => runClassesFinanceChapter(journey));
		await runJourneyChapter(journey, 'accounts', () => runAccountsChapter(journey));

		return {
			steps: journey.steps,
			entities: journey.entities,
			results: journey.ledger.results(),
			structureOk,
			ledger: journey.ledger,
		};
	}
	finally {
		await mkdir(path.dirname(ENTITIES_PATH), { recursive: true });
		await writeFile(ENTITIES_PATH, JSON.stringify({
			steps: journey.steps,
			entities: journey.entities,
			generatedAt: new Date().toISOString(),
		}, null, 2));
	}
}

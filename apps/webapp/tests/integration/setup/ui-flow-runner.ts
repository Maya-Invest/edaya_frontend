import { redactDiagnostic, runScenarios } from '../support/scenario-registry';
import { withArtifactScope } from '../support/scenario-artifacts';
import { createRequiredReadFixtures } from './required-read-fixtures';
import { apiFetch, publishAcademicPeriodsViaApi } from './journey-api';
import { waitForPageQuery } from '../../../scripts/qa-harness-ui';
import assert from 'node:assert/strict';
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
import { bindBrowserScenarioContext, type BrowserScenarioContext } from '../support/browser-scenario';

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
		throw err;
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
        let structureOk = false;
        const chapters = [
          { id: 'structure', dependsOn: [] as string[], run: async () => {
            structureOk = await runStructureChapter(journey);
            if (!structureOk) throw new Error('Journey fail-fast: school structure incomplete');
		// Publish before creating period-scoped facts: publishing later can change
		// the shell's eligible selection and hide the fixtures on reload.
		await publishAcademicPeriodsViaApi(ctx.page, ctx.base);
		await ctx.page.goto(`${ctx.base}/dashboard`, { waitUntil: 'domcontentloaded' });
		await waitForPageQuery(ctx.page);
		const yearId = await ctx.page.getByTestId('academic-year-trigger').getAttribute('data-year-id');
		const response = await apiFetch(ctx.page, ctx.base, '/core/entities/academic-periods/list', { method: 'POST', data: { academicYearId: yearId } });
		assert(response.ok(), 'Required fixture academic periods missing');
		const periods = await response.json() as Array<{ id: string; name: string; startDate: string }>;
		const period = periods.sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
		assert(period, 'Required fixture academic period missing');
		await ctx.page.getByTestId('academic-period-trigger').click();
		await ctx.page.getByRole('option').filter({ has: ctx.page.getByText(period.name, { exact: true }) }).click();
		await waitForPageQuery(ctx.page);
		assert.equal(await ctx.page.getByTestId('academic-period-trigger').getAttribute('data-period-id'), period.id, 'Dashboard term picker must update shared academic scope');
		assert.equal(await ctx.page.locator('#app-sidebar').getByTestId('academic-year-trigger').count(), 1, 'Academic year must live in sidebar context');
		await ctx.page.reload({ waitUntil: 'domcontentloaded' });
		await waitForPageQuery(ctx.page);
		assert.equal(await ctx.page.getByTestId('academic-period-trigger').getAttribute('data-period-id'), period.id, 'Academic term must survive reload');
		assert.equal(await ctx.page.getByTestId('academic-year-trigger').getAttribute('data-year-id'), yearId, 'Academic year must survive reload');

          } },
          { id: 'configuration', dependsOn: ['structure'], run: () => runConfigurationChapter(journey) },
          { id: 'people', dependsOn: ['configuration'], run: () => runPeopleChapter(journey) },
          { id: 'school', dependsOn: ['people'], run: () => runSchoolChapter(journey) },
          { id: 'teaching', dependsOn: ['configuration', 'people'], run: () => runTeachingChapter(journey) },
          { id: 'required-read-fixtures', dependsOn: ['teaching'], run: () => createRequiredReadFixtures(journey) },
          { id: 'family-feedback', dependsOn: ['school', 'required-read-fixtures'], run: () => runFamilyFeedbackChapter(journey) },
          { id: 'classes-finance', dependsOn: ['required-read-fixtures'], run: () => runClassesFinanceChapter(journey) },
          { id: 'accounts', dependsOn: ['people'], run: () => runAccountsChapter(journey) },
        ];
        const outcomes = await runScenarios<BrowserScenarioContext>(chapters.map(chapter => ({ id: `journey.${chapter.id}`, feature: 'provisioned-journey',
          dependsOn: chapter.dependsOn.map(id => `journey.${id}`), fixtureRequirements: ['journey'],
          steps: [{ id: chapter.id, run: async () => {
          const start = journey.steps.length;
          const ledgerStart = journey.ledger.results().length;
          await withArtifactScope({ id: `journey.${chapter.id}`, expected: chapter.id, directory: ctx.outDir, page: ctx.page }, async () => {
            await runJourneyChapter(journey, chapter.id, chapter.run);
            if (journey.steps.slice(start).some(step => !step.ok || step.blocked)) {
              throw new Error(`Journey chapter ${chapter.id} returned failed setup steps`);
            }
            const failures = journey.ledger.results().slice(ledgerStart).filter(result => result.statut !== 'OK');
            if (failures.length) throw new Error(failures.map(result => `${result.action}: ${result.detail ?? result.statut}`).join('\n'));
          });
        } }] })), {
          createContext: async (_definition, cleanup) => bindBrowserScenarioContext({ browser: ctx.page.context().browser()!, base: ctx.base,
            outDir: ctx.outDir, fixtures: { journey } }, ctx.page, cleanup),
        });
        for (const outcome of outcomes.filter(result => result.status !== 'passed')) {
          const name = outcome.id.replace('journey.', '');
          if (!journey.steps.some(step => step.step === name && !step.ok)) {
            journey.steps.push({ step: name, ok: false, blocked: outcome.status === 'blocked', detail: outcome.detail });
          }
        }

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

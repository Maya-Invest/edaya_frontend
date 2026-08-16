/**
 * Shared Playwright helpers for the owner UI journey.
 */
import type { Page } from 'playwright';
import type { DemoContext } from '../demo-dry-run/support/types';
import {
	assertNoFatalError,
	emptyEntities,
	waitForAppShell,
	type MatrixEntities,
	type MatrixResult,
	type MatrixStatut,
} from '../../../scripts/qa-matrix-support';
import {
	dismissPageError,
	waitForPageQuery,
} from '../../../scripts/qa-harness-ui';
import type { QaTemplateRow } from '../../../scripts/qa-template-matrix.manual';
import { JourneyLedger } from './journey-ledger';

export interface SetupStepResult {
	step: string;
	ok: boolean;
	blocked?: boolean;
	detail?: string;
	entityId?: string;
}

export interface UiJourney {
	ctx: DemoContext;
	entities: MatrixEntities;
	ledger: JourneyLedger;
	steps: SetupStepResult[];
	onRecord: (result: MatrixResult) => void;
}

export function createUiJourney(
	ctx: DemoContext,
	matrix: readonly QaTemplateRow[],
	onRecord: (result: MatrixResult) => void,
): UiJourney {
	return {
		ctx,
		entities: emptyEntities(),
		ledger: new JourneyLedger(matrix),
		steps: [],
		onRecord,
	};
}

export async function gotoApp(journey: UiJourney, routePath: string): Promise<void> {
	const { page, base } = journey.ctx;
	await page.goto(`${base}${routePath}`, { waitUntil: 'domcontentloaded' });
	await waitForAppShell(page);
	await waitForPageQuery(page);
	await dismissPageError(page);
}

export async function visitCovered(
	journey: UiJourney,
	templatePath: string,
	actualPath: string,
	statutIfOk: MatrixStatut = 'OK',
): Promise<string | null> {
	await gotoApp(journey, actualPath);
	const fatal = await assertNoFatalError(journey.ctx.page);
	const statut: MatrixStatut = fatal ? 'NOT OK' : statutIfOk;
	const detail = fatal ?? undefined;
	for (const result of journey.ledger.coverVisit(templatePath, statut, detail)) {
		journey.onRecord(result);
	}
	return fatal;
}

export function coverActions(
	journey: UiJourney,
	templatePath: string,
	actions: readonly string[],
	statut: MatrixStatut,
	detail?: string,
): void {
	for (const result of journey.ledger.coverPath(templatePath, statut, detail, actions)) {
		journey.onRecord(result);
	}
}

export function coverModal(
	journey: UiJourney,
	parentRoute: string,
	modal: string,
	statut: MatrixStatut,
	detail?: string,
): void {
	for (const result of journey.ledger.coverModal(parentRoute, modal, statut, detail)) {
		journey.onRecord(result);
	}
}

export function logStep(journey: UiJourney, result: SetupStepResult): void {
	journey.steps.push(result);
	const tag = result.blocked ? '⊘' : result.ok ? '✓' : '✗';
	console.log(`${tag} ${result.step}${result.detail ? ` — ${result.detail.slice(0, 120)}` : ''}`);
}

function commandPublicName(fragment: string): string {
	if (fragment.includes('-')) {
		return fragment;
	}
	return fragment.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, '');
}

export async function waitForCommandPayload(
	page: Page,
	commandFragment: string,
	timeout = 45_000,
): Promise<Record<string, unknown> | null> {
	const publicName = commandPublicName(commandFragment);
	const response = await page.waitForResponse(
		res => res.request().method() === 'POST'
			&& (res.url().includes(`/core/commands/${publicName}`)
				|| res.url().includes(`/core/commands/${commandFragment}`)),
		{ timeout },
	).catch(() => null);
	if (!response?.ok()) {
		return null;
	}
	const postData = response.request().postData();
	if (postData) {
		try {
			return JSON.parse(postData) as Record<string, unknown>;
		}
		catch {
			return null;
		}
	}
	try {
		return await response.json() as Record<string, unknown>;
	}
	catch {
		return null;
	}
}

export function idFromUrl(page: Page, pattern: RegExp): string | null {
	return page.url().match(pattern)?.[1] ?? null;
}

export async function clickFirstRow(page: Page): Promise<boolean> {
	const row = page.locator('main [role="button"][tabindex="0"], main table tbody tr, main a[href]').first();
	if (!(await row.isVisible({ timeout: 8_000 }).catch(() => false))) {
		return false;
	}
	await row.click();
	await page.waitForTimeout(600);
	return true;
}

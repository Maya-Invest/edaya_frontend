/**
 * Web UI tenant setup — academic structure + baseline entities via Playwright.
 * Runs after API provision (school + wizard flag) and login.
 *
 * Policy: failures are logged to setupSteps[] — do not patch frontend src/ to fix.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DemoContext } from '../demo-dry-run/support/types';
import {
	dismissPageError,
	ensureAcademicYearReady,
	fillClassCreateDialog,
	fillGradeLevelCreateDialog,
	fillStudentCreateDialog,
	openDialogButton,
	refreshAppShell,
	submitDialog,
	waitForDialogClosed,
	waitForPageQuery,
} from '../../../scripts/qa-harness-ui';
import {
	configEntityIdByName,
	discoverEntities,
	emptyEntities,
	waitForAppShell,
} from '../../../scripts/qa-matrix-support';
import type { MatrixEntities } from '../../../scripts/qa-matrix-support';

const WEBAPP_DIR = path.join(import.meta.dirname, '../../..');
export const ENTITIES_PATH = path.join(WEBAPP_DIR, '.integration-run', 'entities.json');

export interface SetupStepResult {
	step: string;
	ok: boolean;
	blocked?: boolean;
	detail?: string;
	entityId?: string;
}

export interface WebSetupResult {
	steps: SetupStepResult[];
	entities: MatrixEntities;
}

async function gotoAppPage(ctx: DemoContext, routePath: string): Promise<void> {
	const { page, base } = ctx;
	await page.goto(`${base}${routePath}`, { waitUntil: 'domcontentloaded' });
	await waitForAppShell(page);
}

async function setupAcademicYear(ctx: DemoContext): Promise<SetupStepResult> {
	const { page } = ctx;
	try {
		await gotoAppPage(ctx, '/configuration/academic');
		await waitForPageQuery(page);
		await dismissPageError(page);

		const opened = await openDialogButton(page, /nouvelle année scolaire|new academic year/i);
		if (!opened) {
			return { step: 'academic-year', ok: false, detail: 'Create year button or modal not found' };
		}

		const label = `E2E ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
		const dialog = page.getByRole('dialog');
		await dialog.locator('input').first().fill(label);
		await submitDialog(page);
		if (!(await waitForDialogClosed(page))) {
			return { step: 'academic-year', ok: false, detail: 'Create year modal still open after submit' };
		}
		await waitForPageQuery(page);
		await page.getByRole('heading', { name: label, exact: true }).waitFor({ state: 'visible', timeout: 20_000 });

		const ready = await ensureAcademicYearReady(page, label);
		if (!ready) {
			return { step: 'academic-year', ok: false, detail: `Year created but not visible as published (${label})` };
		}

		await refreshAppShell(page, ctx.base);
		return { step: 'academic-year', ok: true, detail: `${label} (published)` };
	}
	catch (err) {
		return {
			step: 'academic-year',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}

async function setupGradeLevel(ctx: DemoContext): Promise<SetupStepResult> {
	const { page } = ctx;
	try {
		await gotoAppPage(ctx, '/configuration/grade-levels');
		await waitForPageQuery(page);
		await dismissPageError(page);

		const opened = await openDialogButton(page, /ajouter un niveau|add grade level/i);
		if (!opened) {
			return { step: 'grade-level', ok: false, detail: 'Create grade level modal not found' };
		}

		const name = `E2E-6eme-${Date.now()}`;
		await fillGradeLevelCreateDialog(page, name);
		if (!(await waitForDialogClosed(page))) {
			return { step: 'grade-level', ok: false, detail: 'Grade level modal still open after submit' };
		}
		await page.waitForTimeout(1_000);
		await refreshAppShell(page, ctx.base);

		await gotoAppPage(ctx, '/configuration/grade-levels');
		await waitForPageQuery(page);
		const entityId = await configEntityIdByName(page, name);
		return { step: 'grade-level', ok: true, detail: name, entityId: entityId ?? undefined };
	}
	catch (err) {
		return {
			step: 'grade-level',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}

async function setupClass(ctx: DemoContext): Promise<SetupStepResult> {
	const { page } = ctx;
	try {
		await gotoAppPage(ctx, '/configuration/classes');
		await waitForPageQuery(page);
		await dismissPageError(page);

		const opened = await openDialogButton(page, /ajouter une classe|add class/i);
		if (!opened) {
			const pageError = await page.getByText(/unable to load|une erreur est survenue/i).first().isVisible().catch(() => false);
			return {
				step: 'class',
				ok: false,
				detail: pageError ? 'Classes page failed to load' : 'Create class modal not found',
			};
		}

		const className = `E2E-6A-${Date.now()}`;
		await fillClassCreateDialog(page, className);
		if (!(await waitForDialogClosed(page))) {
			return { step: 'class', ok: false, detail: 'Class modal still open after submit' };
		}
		await page.waitForTimeout(1_000);
		await refreshAppShell(page, ctx.base);

		await gotoAppPage(ctx, '/configuration/classes');
		await waitForPageQuery(page);
		const entityId = await configEntityIdByName(page, className);
		if (!entityId) {
			return { step: 'class', ok: false, detail: `Class "${className}" not found in list after create` };
		}

		return { step: 'class', ok: true, detail: className, entityId };
	}
	catch (err) {
		return {
			step: 'class',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}

async function setupStudent(ctx: DemoContext): Promise<SetupStepResult> {
	const { page } = ctx;
	try {
		await gotoAppPage(ctx, '/school/students');
		await waitForPageQuery(page);
		await dismissPageError(page);

		const opened = await openDialogButton(page, /nouvel élève|new student/i, 30_000);
		if (!opened) {
			const pageError = await page.getByText(/unable to load|une erreur est survenue/i).first().isVisible().catch(() => false);
			return {
				step: 'student',
				ok: false,
				detail: pageError ? 'Students page failed to load' : 'Create student modal not found',
			};
		}

		await fillStudentCreateDialog(page);
		if (!(await waitForDialogClosed(page))) {
			return { step: 'student', ok: false, detail: 'Student modal still open after submit' };
		}

		return { step: 'student', ok: true, detail: 'Student created' };
	}
	catch (err) {
		return {
			step: 'student',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
		};
	}
}

export async function runWebTenantSetup(ctx: DemoContext): Promise<WebSetupResult> {
	const steps: SetupStepResult[] = [];

	console.log('\n--- Web tenant setup (via UI) ---');
	for (const fn of [setupAcademicYear, setupGradeLevel, setupClass, setupStudent]) {
		const result = await fn(ctx);
		steps.push(result);
		const tag = result.blocked ? '⊘' : result.ok ? '✓' : '✗';
		console.log(`${tag} ${result.step}${result.detail ? ` — ${result.detail.slice(0, 100)}` : ''}`);
	}

	const entities = emptyEntities();
	entities.onboarded = true;

	if (steps.some(s => s.step === 'student' && s.blocked)) {
		entities.studentSetupBlocked = true;
	}

	const classStep = steps.find(s => s.step === 'class' && s.ok && s.entityId);
	if (classStep?.entityId) {
		entities.configClassId = classStep.entityId;
		entities.classId = classStep.entityId;
	}

	const gradeStep = steps.find(s => s.step === 'grade-level' && s.ok && s.entityId);
	if (gradeStep?.entityId) {
		entities.gradeLevelId = gradeStep.entityId;
		entities.level = gradeStep.entityId;
	}

	Object.assign(entities, await discoverEntities(ctx).catch((err) => {
		console.warn(`discoverEntities skipped: ${err instanceof Error ? err.message : String(err)}`);
		return emptyEntities();
	}));

	if (classStep?.entityId) {
		entities.configClassId = classStep.entityId;
		entities.classId = classStep.entityId;
	}
	if (gradeStep?.entityId) {
		entities.gradeLevelId = gradeStep.entityId;
		entities.level = gradeStep.entityId;
	}

	if (steps.some(s => s.step === 'student' && s.ok)) {
		entities.createdStudentId = entities.studentId ?? 'created';
	}

	await mkdir(path.dirname(ENTITIES_PATH), { recursive: true });
	await writeFile(ENTITIES_PATH, JSON.stringify({ steps, entities, generatedAt: new Date().toISOString() }, null, 2));

	return { steps, entities };
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

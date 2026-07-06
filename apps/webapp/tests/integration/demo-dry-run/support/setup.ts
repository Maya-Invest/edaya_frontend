import type { DemoContext, EnsureDailyAttendanceOptions } from './types';
import { visit } from './visit';

export async function assignHomeroomCoordinator(
	ctx: DemoContext,
	namePattern: RegExp = /Assi/i,
): Promise<boolean> {
	const { page } = ctx;
	const picker = page
		.getByRole('button', {
			name: /select a staff member|sélectionner un membre du personnel/i,
		})
		.last();
	if (!(await picker.isVisible({ timeout: 3_000 }).catch(() => false))) {
		return false;
	}
	await picker.click();
	const search = page.locator('[role="dialog"] input, [data-state="open"] input').last();
	await search.fill('Assi');
	const option = page.getByRole('option', { name: namePattern }).first();
	if (!(await option.isVisible({ timeout: 5_000 }).catch(() => false))) {
		await page.keyboard.press('Escape');
		return false;
	}
	await option.click();
	return true;
}

export async function ensureDailyAttendanceMode(
	ctx: DemoContext,
	classId: string,
	options: EnsureDailyAttendanceOptions = {},
): Promise<boolean> {
	const { homeroomStaffName, force = false } = options;
	const { page, base } = ctx;

	await visit(ctx, `${base}/configuration/classes/${classId}`, 'setup', `Open ${classId} config`, {
		pathPrefix: `/configuration/classes/${classId}`,
		selector: 'main',
	});

	const dailyOk = await page
		.getByText(/daily roll call|appel quotidien/i)
		.isVisible({ timeout: 5_000 })
		.catch(() => false);
	const coordinatorBlock = page.locator('div').filter({
		has: page.getByText(/^Staff coordinator$|^Référent personnel$/i),
	}).last();
	const homeroomOk = homeroomStaffName
		? await coordinatorBlock.getByText(homeroomStaffName).isVisible({ timeout: 2_000 }).catch(() => false)
		: true;
	if (!force && dailyOk && homeroomOk) {
		return true;
	}

	const editBtn = page.getByRole('button', { name: /edit|modifier/i });
	if (!(await editBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
		return false;
	}
	await editBtn.click();
	await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 10_000 });

	if (!dailyOk) {
		const modeSelect = page.locator('[role="dialog"] select').filter({
			has: page.locator('option[value="daily"]'),
		}).last();
		await modeSelect.selectOption('daily');
	}

	if (homeroomStaffName && !homeroomOk) {
		await assignHomeroomCoordinator(ctx, homeroomStaffName);
	}

	await page.getByRole('button', { name: /save|enregistrer/i }).click();
	await page.locator('[role="dialog"]').waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});
	await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
	await page.waitForTimeout(2_000);
	return true;
}

export async function assertClassAttendanceNav(
	ctx: DemoContext,
	classId: string,
	scene: string,
	step: string,
): Promise<boolean> {
	const { page, base, reporter, shot } = ctx;
	const classPath = `/classes/${classId}`;
	await visit(ctx, `${base}${classPath}/students`, scene, `${step} — class shell`, {
		pathPrefix: classPath,
		selector: 'main',
	});

	const classesToggle = page
		.locator('aside#app-sidebar button, aside#app-sidebar a')
		.filter({ hasText: /classes|classe/i })
		.first();
	if (await classesToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
		await classesToggle.click().catch(() => {});
	}

	const attendanceLink = page.locator(`aside#app-sidebar a[href*="/classes/${classId}/attendance"]`);
	const visible = await attendanceLink.isVisible({ timeout: 10_000 }).catch(() => false);
	if (visible) {
		reporter.log(scene, step, 'pass');
		return true;
	}
	reporter.log(scene, step, 'fail', 'Attendance nav tab not visible for daily class');
	await shot(`${scene}-${step.replace(/\s+/g, '-')}`);
	return false;
}

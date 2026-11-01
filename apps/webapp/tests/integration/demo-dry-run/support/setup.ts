import { chooseOption } from '../../support/custom-select';
import { openUrlModal } from '../../../../scripts/qa-harness-ui';
import { configClassGroupPath } from './paths';
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

	await visit(ctx, `${base}${configClassGroupPath(classId, 'profile')}`, 'setup', `Open ${classId} config`, {
		pathPrefix: `/configuration/structure/classes/${classId}`,
		selector: 'aside#app-sidebar',
	});

	const dailyModePattern = /^(Appel quotidien|Daily roll call)$/i;
	const dailyOk = await page
		.getByText(dailyModePattern)
		.first()
		.isVisible({ timeout: 8_000 })
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

	const modalOpened = await openUrlModal(
		page,
		`/configuration/structure/classes/${classId}/profile`,
		'edit',
		{ base, timeout: 12_000 },
	);
	if (!modalOpened) {
		const editBtn = page.getByRole('button', { name: /edit|modifier/i });
		if (!(await editBtn.isVisible({ timeout: 10_000 }).catch(() => false))) {
			return false;
		}
		await editBtn.click();
	}
	await page.getByTestId('form-modal').waitFor({ state: 'visible', timeout: 10_000 });

	if (!dailyOk || force) {
		const modeSelect = page.getByTestId('form-modal').locator('select').filter({
			has: page.locator('option[value="daily"]'),
		}).last();
		const currentMode = await modeSelect.inputValue().catch(() => 'session');
		if (currentMode !== 'daily') {
			await chooseOption(modeSelect, 'daily');
		}
	}

	if (homeroomStaffName && !homeroomOk) {
		await assignHomeroomCoordinator(ctx, homeroomStaffName);
	}

	const saveBtn = page.getByTestId('form-modal-submit')
		.or(page.getByRole('button', { name: /save|enregistrer/i }))
		.last();
	await saveBtn.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
	if (await saveBtn.isDisabled().catch(() => false)) {
		await page.waitForTimeout(1_000);
	}
	await saveBtn.click();
	await page.getByTestId('form-modal').waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {});

	const dailyConfigured = await page
		.getByText(dailyModePattern)
		.first()
		.isVisible({ timeout: 8_000 })
		.catch(() => false);
	return dailyConfigured && (homeroomStaffName ? homeroomOk || await coordinatorBlock.getByText(homeroomStaffName).isVisible({ timeout: 2_000 }).catch(() => false) : true);
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
	const attendanceLink = page.locator(`aside#app-sidebar a[href*="/classes/${classId}/attendance"]`);
	if (!await attendanceLink.isVisible() && await classesToggle.isVisible({ timeout: 3_000 }).catch(() => false)) {
		await classesToggle.click().catch(() => {});
	}

	const visible = await attendanceLink.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
	if (visible) {
		reporter.log(scene, step, 'pass');
		return true;
	}
	reporter.log(scene, step, 'fail', 'Attendance nav tab not visible for daily class');
	await shot(`${scene}-${step.replace(/\s+/g, '-')}`);
	return false;
}

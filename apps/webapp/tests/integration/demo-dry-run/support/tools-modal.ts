import type { DemoContext } from './types';
import { closeFormModal } from './modal';

export async function openTimetableGenerationModal(ctx: DemoContext): Promise<boolean> {
	const tool = ctx.page.getByTestId('timetable-planning-tool');
	if (!(await tool.isVisible({ timeout: 15_000 }).catch(() => false))) {
		return false;
	}
	const action = ctx.page.getByTestId('timetable-planning-action');
	if (!(await action.isVisible({ timeout: 5_000 }).catch(() => false))) {
		return false;
	}
	await action.click();
	return ctx.page
		.getByTestId('form-modal')
		.waitFor({ state: 'visible', timeout: 15_000 })
		.then(() => true)
		.catch(() => false);
}

export async function waitForTimetableGenerationModal(ctx: DemoContext, timeoutMs = 15_000): Promise<boolean> {
	return ctx.page
		.getByTestId('form-modal')
		.waitFor({ state: 'visible', timeout: timeoutMs })
		.then(() => true)
		.catch(() => false);
}

export async function closeTimetableGenerationModal(ctx: DemoContext): Promise<boolean> {
	if (await closeFormModal(ctx)) {
		await ctx.page.waitForTimeout(400);
		const hidden = await ctx.page
			.getByTestId('form-modal')
			.waitFor({ state: 'hidden', timeout: 5_000 })
			.then(() => true)
			.catch(() => false);
		if (hidden) {
			return true;
		}
	}
	await ctx.page.keyboard.press('Escape');
	await ctx.page.waitForTimeout(400);
	return ctx.page
		.getByTestId('form-modal')
		.isVisible({ timeout: 1_000 })
		.then(visible => !visible)
		.catch(() => true);
}

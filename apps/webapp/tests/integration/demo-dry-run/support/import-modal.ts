import path from 'node:path';
import type { DemoContext } from './types';

const FIXTURE_PATH = path.join(
	import.meta.dirname,
	'fixtures/student-import-sample.csv',
);

export function studentImportFixturePath(): string {
	return FIXTURE_PATH;
}

export async function openImportModal(ctx: DemoContext): Promise<boolean> {
	const action = ctx.page.getByTestId('import-action');
	if (!(await action.isVisible({ timeout: 15_000 }).catch(() => false))) {
		return false;
	}
	await action.click();
	const modal = ctx.page.getByTestId('data-import-modal');
	return modal.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);
}

export async function waitForImportModal(ctx: DemoContext, timeoutMs = 15_000): Promise<boolean> {
	return ctx.page
		.getByTestId('data-import-modal')
		.waitFor({ state: 'visible', timeout: timeoutMs })
		.then(() => true)
		.catch(() => false);
}

export async function uploadStudentImportFile(ctx: DemoContext): Promise<boolean> {
	const input = ctx.page.getByTestId('import-file-input');
	await input.setInputFiles(studentImportFixturePath());
	const parsed = await ctx.page
		.getByTestId('student-import-parse-success')
		.waitFor({ state: 'visible', timeout: 30_000 })
		.then(() => true)
		.catch(() => false);
	if (parsed) {
		return true;
	}
	return ctx.page
		.getByTestId('import-selected-file')
		.waitFor({ state: 'visible', timeout: 5_000 })
		.then(() => true)
		.catch(() => false);
}

export async function closeImportModal(ctx: DemoContext): Promise<boolean> {
	await ctx.page.keyboard.press('Escape');
	await ctx.page.waitForTimeout(400);
	const hidden = await ctx.page
		.getByTestId('data-import-modal')
		.waitFor({ state: 'hidden', timeout: 5_000 })
		.then(() => true)
		.catch(() => false);
	return hidden;
}

import {
	closeImportModal,
	openImportModal,
	uploadStudentImportFile,
	waitForImportModal,
} from '../support/import-modal';
import type { DemoContext } from '../support/types';
import { visit } from '../support/visit';

/** Data import modal: open, upload CSV, reach validate step, close without execute. */
export async function runImportScene(ctx: DemoContext): Promise<void> {
	const scene = 'DI';
	const { base, reporter, shot } = ctx;

	if (!(await visit(ctx, `${base}/configuration/tools`, scene, '1 Tools hub', {
		pathPrefix: '/configuration/tools',
		selector: '[data-testid="import-pack-generic"]',
	}))) {
		return;
	}

	if (await openImportModal(ctx)) {
		reporter.log(scene, '2 Import modal visible', 'pass');
	}
	else {
		reporter.log(scene, '2 Import modal visible', 'fail', 'data-import-modal not found');
		await shot('DI-2-import-modal');
		return;
	}

	const nextBtn = ctx.page.getByTestId('data-import-next');
	if (await nextBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await nextBtn.click();
		await ctx.page.waitForTimeout(300);
	}

	const uploadStep = ctx.page.getByTestId('student-import-step-upload');
	if (await uploadStep.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false)) {
		reporter.log(scene, '3 Upload step', 'pass');
	}
	else {
		reporter.log(scene, '3 Upload step', 'fail', 'student-import-step-upload not visible');
		await shot('DI-3-upload-step');
		await closeImportModal(ctx);
		return;
	}

	if (await uploadStudentImportFile(ctx)) {
		reporter.log(scene, '4 CSV parse success', 'pass');
	}
	else {
		reporter.log(scene, '4 CSV parse success', 'fail', 'Parse success indicator missing');
		await shot('DI-4-parse');
		await closeImportModal(ctx);
		return;
	}

	const validateNext = ctx.page.getByTestId('data-import-next');
	if (await validateNext.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await validateNext.click();
	}

	const validateStep = ctx.page.getByTestId('student-import-step-validate');
	if (await validateStep.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false)) {
		reporter.log(scene, '5 Validate step', 'pass');
	}
	else {
		reporter.log(scene, '5 Validate step', 'fail', 'student-import-step-validate not visible');
		await shot('DI-5-validate');
	}

	if (await closeImportModal(ctx) && !(await waitForImportModal(ctx, 2_000))) {
		reporter.log(scene, '6 Close modal', 'pass');
	}
	else {
		reporter.log(scene, '6 Close modal', 'fail', 'Modal still visible after close');
		await shot('DI-6-close');
	}
}

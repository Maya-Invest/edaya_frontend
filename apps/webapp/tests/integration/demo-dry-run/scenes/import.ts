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

  await ctx.page.getByTestId('import-create').click();
  await ctx.page.getByTestId('data-import-type-select').selectOption('students');
  await ctx.page.getByTestId('import-file-input').waitFor({ state: 'visible' });
  if (!await uploadStudentImportFile(ctx)) throw new Error('Server upload failed');
  await ctx.page.getByTestId('task-step-preview').click();
  await ctx.page.getByTestId('import-validate').click();
  await ctx.page.locator('[data-testid="import-progress"][data-state="validated"]').waitFor({ state: 'visible', timeout: 30000 });
  reporter.log(scene, '5 Server preview available; no live execution', 'pass');

	if (await closeImportModal(ctx) && !(await waitForImportModal(ctx, 2_000))) {
		reporter.log(scene, '6 Close modal', 'pass');
	}
	else {
		reporter.log(scene, '6 Close modal', 'fail', 'Modal still visible after close');
		await shot('DI-6-close');
	}
}

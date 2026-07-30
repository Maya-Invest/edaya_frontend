import {
	closeTimetableGenerationModal,
	openTimetableGenerationModal,
	openTimetablePublishModal,
} from '../support/tools-modal';
import type { DemoContext } from '../support/types';
import { visit } from '../support/visit';

/** Tools hub timetable generation + publish modals (state-based, not URL-backed). */
export async function runToolsModalsScene(ctx: DemoContext): Promise<void> {
	const scene = 'DT';
	const { base, reporter, shot, page } = ctx;

	if (!(await visit(ctx, `${base}/configuration/tools`, scene, '1 Tools hub', {
		pathPrefix: '/configuration/tools',
		selector: '[data-testid="timetable-planning-tool"]',
	}))) {
		return;
	}

	if (await openTimetableGenerationModal(ctx)) {
		reporter.log(scene, '2 Generation modal visible', 'pass');
	}
	else {
		reporter.log(scene, '2 Generation modal visible', 'fail', 'form-modal not found');
		await shot('DT-2-generation-modal');
		return;
	}

	const generateBtn = page.getByRole('button', { name: /generate|génér/i });
	if (await generateBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
		reporter.log(scene, '3 Generation setup UI', 'pass');
	}
	else {
		reporter.log(scene, '3 Generation setup UI', 'fail', 'Generate button not visible');
		await shot('DT-3-setup');
	}

	if (await closeTimetableGenerationModal(ctx)) {
		reporter.log(scene, '4 Close generation modal', 'pass');
	}
	else {
		reporter.log(scene, '4 Close generation modal', 'fail', 'Modal still visible');
		await shot('DT-4-close');
	}

	if (await openTimetablePublishModal(ctx)) {
		reporter.log(scene, '5 Publish modal', 'pass');
		if (!(await closeTimetableGenerationModal(ctx))) {
			reporter.log(scene, '5 Publish modal close', 'fail', 'Publish modal still visible');
			await shot('DT-5-publish-close');
		}
	}
	else {
		reporter.log(scene, '5 Publish modal', 'fail', 'Publish form-modal not found');
		await shot('DT-5-publish-modal');
	}
}

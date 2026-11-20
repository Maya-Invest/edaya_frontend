import {
	closeTimetableGenerationModal,
	openTimetableGenerationModal,
	openTimetablePublishModal,
} from '../support/tools-modal';
import { waitForUrlModal } from '../support/modal';
import type { DemoContext } from '../support/types';
import { visit } from '../support/visit';

/** Tools hub URL-backed generation + publish workflows and nested history close. */
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
		if (await waitForUrlModal(ctx, 'generate-timetable')) {
			reporter.log(scene, '2 Generation modal visible and URL-backed', 'pass');
		}
		else {
			reporter.log(scene, '2 Generation modal visible and URL-backed', 'fail', page.url());
		}
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

	const periodsTab = page.getByRole('tab').nth(1);
	if (await periodsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await periodsTab.click();
		await page.waitForTimeout(300);
		const url = new URL(page.url());
		if (url.searchParams.get('modalTab') === 'periods') {
			reporter.log(scene, '3a Generation panel is URL-backed', 'pass');
		}
		else {
			reporter.log(scene, '3a Generation panel is URL-backed', 'fail', page.url());
		}
	}

	if (await closeTimetableGenerationModal(ctx)) {
		if (await waitForUrlModal(ctx, null, { absent: true })) {
			reporter.log(scene, '4 Close skips nested workflow history', 'pass');
		}
		else {
			reporter.log(scene, '4 Close skips nested workflow history', 'fail', page.url());
		}
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

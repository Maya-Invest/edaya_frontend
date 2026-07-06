import type { Browser } from 'playwright';
import { CLASS_6A, COORDINATOR_EMAIL } from '../support/constants';
import { signIn } from '../support/auth';
import { createDemoContext } from '../support/context';
import { DEMO_DRY_RUN_OUT_DIR } from '../support/paths';
import type { DemoReporter } from '../support/reporter';
import { assertClassAttendanceNav, ensureDailyAttendanceMode } from '../support/setup';
import { assertNoFatalError, visit } from '../support/visit';

export async function runHomeroomNudgeCheck(
	browser: Browser,
	base: string,
	reporter: DemoReporter,
	consoleErrors: string[],
): Promise<void> {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	const ctx = createDemoContext(page, base, DEMO_DRY_RUN_OUT_DIR, reporter, consoleErrors);

	const scene = 'DN';
	try {
		await signIn(ctx, { namePattern: /Mme Assi|Assi/i, email: COORDINATOR_EMAIL });
		reporter.log(scene, 'N.1 Login f.assi@', 'pass');

		const configured = await ensureDailyAttendanceMode(ctx, CLASS_6A, {
			homeroomStaffName: /Assi/i,
			force: true,
		});
		if (!configured) {
			reporter.log(scene, 'N.2 Ensure 6ème A daily mode', 'fail', 'Could not set daily attendance mode');
			return;
		}
		reporter.log(scene, 'N.2 Ensure 6ème A daily mode', 'pass');

		await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
		await visit(ctx, `${base}/dashboard`, scene, 'N.3 Dashboard loads', { selector: 'main' });

		const nudge = page.getByTestId('homeroom-attendance-nudge');
		const appeared = await nudge.waitFor({ timeout: 25_000 }).then(() => true).catch(() => false);
		if (!appeared) {
			reporter.log(scene, 'N.4 Homeroom attendance nudge', 'fail', 'Nudge not visible for homeroom coordinator');
			await ctx.shot('DN-nudge-missing');
			return;
		}

		const nudgeText = await nudge.textContent();
		if (!/roll call|appel du jour/i.test(nudgeText ?? '')) {
			reporter.log(scene, 'N.4 Homeroom attendance nudge', 'fail', 'Unexpected nudge copy');
			await ctx.shot('DN-nudge-copy');
			return;
		}

		const classLink = nudge.locator(`a[href*="/classes/${CLASS_6A}/attendance"]`);
		if (!(await classLink.isVisible({ timeout: 5_000 }).catch(() => false))) {
			reporter.log(scene, 'N.4 Homeroom attendance nudge', 'fail', `Missing link to ${CLASS_6A} attendance`);
			await ctx.shot('DN-nudge-link');
			return;
		}

		if (!/6ème A|6eme A/i.test(nudgeText ?? '')) {
			reporter.log(scene, 'N.4 Homeroom attendance nudge', 'skip', '6ème A label not in nudge — verify locale');
		}
		else {
			reporter.log(scene, 'N.4 Homeroom attendance nudge', 'pass');
		}

		await classLink.click();
		const onAttendance = await page
			.waitForURL(new RegExp(`/classes/${CLASS_6A}/attendance`), { timeout: 15_000 })
			.then(() => true)
			.catch(() => false);
		if (onAttendance && await assertNoFatalError(ctx, scene, 'N.5 Nudge deep-link')) {
			reporter.log(scene, 'N.5 Nudge deep-link to attendance', 'pass');
		}
		else {
			reporter.log(
				scene,
				'N.5 Nudge deep-link to attendance',
				'fail',
				onAttendance ? 'Error on attendance page' : 'Navigation failed',
			);
			await ctx.shot('DN-nudge-nav');
		}
	}
	catch (err) {
		reporter.log(scene, 'N.0 Homeroom nudge scene', 'fail', err instanceof Error ? err.message : String(err));
		await ctx.shot('DN-scene-exception').catch(() => {});
	}
	finally {
		await context.close();
	}
}

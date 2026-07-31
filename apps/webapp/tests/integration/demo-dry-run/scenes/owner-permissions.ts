import type { Browser } from 'playwright';
import { OWNER_EMAIL, STAFF_ID } from '../support/constants';
import { signIn } from '../support/auth';
import { createDemoContext } from '../support/context';
import { waitForDrawerAside } from '../support/drawer';
import { assertFilterSelectShell, assertListShell } from '../support/assertions';
import { waitForFormModal, waitForUrlModal } from '../support/modal';
import { DEMO_DRY_RUN_OUT_DIR, schoolStaffPath } from '../support/paths';
import type { DemoReporter } from '../support/reporter';
import { visit } from '../support/visit';

/** School owner role: permission-gated routes that skip for deputy director. */
export async function runOwnerPermissionChecks(
	browser: Browser,
	base: string,
	reporter: DemoReporter,
	consoleErrors: string[],
): Promise<void> {
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();
	const ctx = createDemoContext(page, base, DEMO_DRY_RUN_OUT_DIR, reporter, consoleErrors);

	const scene = 'DO';
	try {
		await signIn(ctx, { namePattern: /Aminata Koné|Koné/i, email: OWNER_EMAIL });
		reporter.log(scene, 'O.1 Login a.kone@', 'pass');

		if (await visit(ctx, `${base}/configuration/report-cards`, scene, 'O.2 Report card definitions', {
			pathPrefix: '/configuration/report-cards',
		})) {
			await assertFilterSelectShell(ctx, scene, 'O.3 Report card definitions filter shell');
		}

		if (await visit(ctx, `${base}/configuration/grade-scales`, scene, 'O.4 Grade scales list', {
			pathPrefix: '/configuration/grade-scales',
			selector: 'main',
		})) {
			await assertListShell(ctx, scene, 'O.5 Grade scales list shell', { requireFilter: false });
		}

		if (await visit(ctx, `${base}/school/calendar`, scene, 'O.6 School calendar', {
			pathPrefix: '/school/calendar',
			selector: 'main',
		})) {
			reporter.log(scene, 'O.7 Calendar loads for owner', 'pass');
		}

		const permissionsUrl = `${base}${schoolStaffPath(STAFF_ID, 'permissions')}?modal=add-permission`;
		if (await visit(ctx, permissionsUrl, scene, 'O.8 Staff add-permission deep-link', {
			pathPrefix: schoolStaffPath(STAFF_ID, 'permissions'),
		})) {
			if (await waitForDrawerAside(ctx) && await waitForFormModal(ctx) && await waitForUrlModal(ctx, 'add-permission')) {
				reporter.log(scene, 'O.9 URL modal=add-permission', 'pass');
			}
			else {
				reporter.log(scene, 'O.9 URL modal=add-permission', 'fail', 'Permissions modal missing for owner');
				await ctx.shot('DO-O9-permissions');
			}
		}
	}
	catch (err) {
		reporter.log(scene, 'O.0 Owner permissions scene', 'fail', err instanceof Error ? err.message : String(err));
		await ctx.shot('DO-scene-exception').catch(() => {});
	}
	finally {
		await context.close();
	}
}

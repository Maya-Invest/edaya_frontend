import { GUARDIAN_ID } from '../support/constants';
import { closeDrawer, waitForDrawerAside } from '../support/drawer';
import { closeFormModal, waitForFormModal, waitForUrlModal } from '../support/modal';
import { schoolGuardianPath } from '../support/paths';
import type { DemoContext } from '../support/types';
import { visit } from '../support/visit';

/** Guardian drawer deep-link and edit-profile modal URL sync. */
export async function runGuardianDrawerScene(ctx: DemoContext): Promise<void> {
	const scene = 'DG';
	const { base, reporter, shot } = ctx;
	const drawerPath = schoolGuardianPath(GUARDIAN_ID);

	if (await visit(ctx, `${base}${drawerPath}`, scene, '1 Guardian drawer deep-link', {
		pathPrefix: drawerPath,
		expectText: /Koné|Mariam|ci-g1/i,
	})) {
		if (await waitForDrawerAside(ctx)) {
			reporter.log(scene, '2 Guardian drawer visible', 'pass');
		}
		else {
			reporter.log(scene, '2 Guardian drawer visible', 'fail', 'Drawer aside not found');
			await shot('DG-2-drawer');
		}
	}

	if (await visit(ctx, `${base}${drawerPath}?modal=edit-profile`, scene, '3 Edit-profile deep-link', {
		pathPrefix: drawerPath,
	})) {
		if (await waitForDrawerAside(ctx) && await waitForFormModal(ctx) && await waitForUrlModal(ctx, 'edit-profile')) {
			reporter.log(scene, '4 URL modal=edit-profile', 'pass');
		}
		else {
			reporter.log(scene, '4 URL modal=edit-profile', 'fail', 'Drawer or edit-profile modal missing');
			await shot('DG-4-edit-profile');
		}
		await closeFormModal(ctx).catch(() => {});
	}

	if (await visit(ctx, `${base}${drawerPath}`, scene, '5 Reopen for close test', {
		pathPrefix: drawerPath,
	}) && await closeDrawer(ctx)) {
		const currentPath = new URL(ctx.page.url()).pathname;
		if (currentPath === '/school/guardians') {
			reporter.log(scene, '6 Close returns to list', 'pass');
		}
		else {
			reporter.log(scene, '6 Close returns to list', 'fail', `path=${currentPath}`);
			await shot('DG-6-close');
		}
	}
}

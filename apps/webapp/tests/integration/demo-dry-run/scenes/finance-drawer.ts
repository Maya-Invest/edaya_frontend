import { BILLING_ID } from '../support/constants';
import { waitForDrawerAside } from '../support/drawer';
import { closeFormModal, waitForFormModal, waitForUrlModal } from '../support/modal';
import { financeBillingPath } from '../support/paths';
import type { DemoContext } from '../support/types';
import { visit } from '../support/visit';

/** Finance billing drawer deep-link and payment modal URL sync. */
export async function runFinanceDrawerScene(ctx: DemoContext): Promise<void> {
	const scene = 'DF';
	const { base, reporter, shot } = ctx;
	const drawerPath = financeBillingPath(BILLING_ID);

	if (await visit(ctx, `${base}${drawerPath}`, scene, '1 Billing drawer deep-link', {
		pathPrefix: drawerPath,
		expectText: /Kouamé|Scolarité|Collège|overdue|en retard|impayé/i,
	})) {
		if (await waitForDrawerAside(ctx)) {
			reporter.log(scene, '2 Billing drawer visible', 'pass');
		}
		else {
			reporter.log(scene, '2 Billing drawer visible', 'fail', 'Drawer aside not found');
			await shot('DF-2-drawer');
		}
	}

	if (await visit(ctx, `${base}${drawerPath}?modal=payment`, scene, '3 Payment modal deep-link', {
		pathPrefix: drawerPath,
	})) {
		if (await waitForDrawerAside(ctx) && await waitForFormModal(ctx) && await waitForUrlModal(ctx, 'payment')) {
			reporter.log(scene, '4 URL modal=payment', 'pass');
		}
		else {
			reporter.log(scene, '4 URL modal=payment', 'fail', 'Drawer or payment modal missing');
			await shot('DF-4-payment');
		}
		await closeFormModal(ctx).catch(() => {});
	}
}

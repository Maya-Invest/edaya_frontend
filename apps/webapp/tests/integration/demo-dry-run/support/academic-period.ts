import { T1_PERIOD_ID, T1_PERIOD_LABEL } from './constants';
import type { DemoContext } from './types';

/** Select through the contextual picker; use the dashboard on unrelated routes. */
export async function selectAcademicPeriod(
	ctx: DemoContext,
	label: RegExp = T1_PERIOD_LABEL,
	periodId: string = T1_PERIOD_ID,
): Promise<boolean> {
	const { page } = ctx;
	const originalUrl = page.url();
	const toggle = page.getByTestId('academic-period-trigger').last();
	const useDashboard = !(await toggle.isVisible({ timeout: 3_000 }).catch(() => false));
	if (useDashboard) {
		await page.goto(`${ctx.base}/dashboard`, { waitUntil: 'domcontentloaded' });
	}
	await toggle.waitFor({ state: 'visible' });
	if ((await toggle.getAttribute('data-period-id')) !== periodId) {
		await toggle.click();
		await page.getByRole('option', { name: label }).click();
	}
	if ((await toggle.getAttribute('data-period-id')) !== periodId) {
		throw new Error(`Academic term selection did not resolve to ${periodId}`);
	}
	if (useDashboard) {
		await page.goto(originalUrl, { waitUntil: 'domcontentloaded' });
	}
	return true;
}

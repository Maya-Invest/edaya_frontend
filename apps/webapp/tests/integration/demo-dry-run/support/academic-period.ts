import { T1_PERIOD_ID, T1_PERIOD_LABEL } from './constants';
import type { DemoContext } from './types';

/** Select an academic period (defaults to demo-ci T1). Prefers sessionStorage for reliability. */
export async function selectAcademicPeriod(
	ctx: DemoContext,
	label: RegExp = T1_PERIOD_LABEL,
	periodId: string = T1_PERIOD_ID,
): Promise<boolean> {
	const { page } = ctx;
	await page.evaluate((id) => {
		sessionStorage.setItem('edaya:periodId', id);
	}, periodId);

	// Prefer the period control that includes a month range (e.g. "Sep — Dec").
	const periodToggle = page
		.locator('button')
		.filter({ hasText: /Trimestre|Term/i })
		.filter({ hasText: /[A-Za-z]{3}\s*[—–-]/i })
		.first();
	const fallbackToggle = page.locator('button').filter({ hasText: /Trimestre|Term/i }).first();
	const toggle = (await periodToggle.isVisible({ timeout: 3_000 }).catch(() => false))
		? periodToggle
		: fallbackToggle;
	if (!(await toggle.isVisible({ timeout: 10_000 }).catch(() => false))) {
		await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
		return true;
	}
	const current = (await toggle.innerText().catch(() => '')).trim();
	if (label.test(current)) {
		return true;
	}
	await toggle.click();
	const option = page.locator('button').filter({ hasText: label }).first();
	if (!(await option.isVisible({ timeout: 5_000 }).catch(() => false))) {
		await page.keyboard.press('Escape').catch(() => {});
		await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
		return true;
	}
	await option.click();
	await page.waitForTimeout(200);
	return true;
}

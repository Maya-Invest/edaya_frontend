import type { Browser } from 'playwright';
import { uniqueOnboardingEmail, uniqueOnboardingPassword } from '../support/capture';
import { expectAppDashboard } from '../support/auth';
import { acceptInviteThroughUi, inviteStaffFromOwnerPage, withIsolatedPage } from '../support/invite';
import { runHappyPath } from './happy-path';

export async function runInvitedStaffSecondSchool(
	browser: Browser,
	base: string,
	outDir: string,
	staff: { email: string; password: string },
): Promise<void> {
	const credentials = {
		email: uniqueOnboardingEmail(),
		password: uniqueOnboardingPassword(),
		name: 'Second School Owner',
		schoolName: `Second School ${Date.now()}`,
		city: 'Abidjan',
	};

	await withIsolatedPage(browser, async (ownerPage) => {
		await runHappyPath({
			page: ownerPage,
			browser,
			base,
			outDir,
			credentials,
		});
		const token = await inviteStaffFromOwnerPage(ownerPage, base, staff.email);

		await withIsolatedPage(browser, async (page) => {
			await acceptInviteThroughUi(page, base, {
				token,
				name: 'Invited Staff',
				email: staff.email,
				password: staff.password,
				kind: 'staff',
				mode: 'signIn',
			});
			await expectAppDashboard(page);
			if (page.url().includes('/onboarding')) {
				throw new Error(`Second-school staff invite landed on onboarding: ${page.url()}`);
			}

			const menu = page.getByTestId('school-selector-menu');
			await menu.waitFor({ state: 'visible', timeout: 20_000 });
			await menu.click();
			const options = page.getByTestId('school-selector-option');
			await options.first().waitFor({ state: 'visible', timeout: 10_000 });
			if (await options.count() < 2) {
				throw new Error(`Expected two staff schools in the sidebar popup, found ${await options.count()}`);
			}

			const currentName = (await page.getByTestId('school-selector').locator('p').innerText()).trim();
			const other = page.locator('[data-testid="school-selector-option"]:not([aria-current="true"])').first();
			await other.click();
			await page.waitForFunction((previous) => {
				const label = document.querySelector('[data-testid="school-selector"] p');
				const next = label?.textContent?.trim() ?? '';
				return next.length > 0 && next !== previous;
			}, currentName, { timeout: 30_000 });
			await expectAppDashboard(page);
		});
	});
}

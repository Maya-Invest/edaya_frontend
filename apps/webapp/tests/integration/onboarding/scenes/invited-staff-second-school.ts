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

			const other = page.locator('[data-testid="school-selector-option"]:not([aria-current="true"])').first();
			const targetSchoolId = await other.getAttribute('data-school-id');
			if (!targetSchoolId) throw new Error('School switch option has no school identity');
			const grants = page.waitForResponse(response =>
				response.url().endsWith('/core/authorization/effective-grants')
				&& response.request().headers()['x-school-id'] === targetSchoolId, { timeout: 30_000 });
			await other.click();
			const grantsResponse = await grants;
			if (!grantsResponse.ok()) {
				const yearId = grantsResponse.request().headers()['x-academic-year-id'] ?? 'none';
				throw new Error(`School switch grants failed: HTTP ${grantsResponse.status()}, school=${targetSchoolId}, year=${yearId}`);
			}
			await page.waitForFunction(schoolId =>
				document.querySelector('[data-testid="academic-year-trigger"]')?.getAttribute('data-school-id') === schoolId,
				targetSchoolId, { timeout: 30_000 });
			await page.reload({ waitUntil: 'domcontentloaded' });
			await expectAppDashboard(page);
			await page.waitForFunction(schoolId =>
				document.querySelector('[data-testid="academic-year-trigger"]')?.getAttribute('data-school-id') === schoolId,
				targetSchoolId, { timeout: 30_000 });
		});
	});
}

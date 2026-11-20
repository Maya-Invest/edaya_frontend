import { chooseOption, selectOptions } from '../../support/custom-select';
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

			const menu = page.getByTestId('academic-year-trigger');
			await menu.click();
			const schoolChoice = page.getByTestId('workspace-school-choice');
			const schoolIds = await selectOptions(schoolChoice).evaluateAll(nodes => nodes.map(node => (node as HTMLOptionElement).value));
			const shell = page.getByTestId('app-shell');
			const currentSchoolId = await shell.getAttribute('data-school-id');
			const targetSchoolId = schoolIds.find(id => id !== currentSchoolId);
			if (!currentSchoolId || !targetSchoolId || targetSchoolId === currentSchoolId) {
				throw new Error('School switch requires two distinct school IDs');
			}

			async function selectSchool(schoolId: string) {
				await chooseOption(schoolChoice, schoolId);
				const [grants] = await Promise.all([
					page.waitForResponse(response =>
						response.url().endsWith('/core/authorization/effective-grants')
						&& response.request().headers()['x-school-id'] === schoolId, { timeout: 30_000 }),
					page.getByTestId('academic-year-apply').click(),
				]);
				if (!grants.ok()) throw new Error(`School switch grants failed: HTTP ${grants.status()}, school=${schoolId}`);
				await page.locator(`[data-testid="app-shell"][data-school-id="${schoolId}"]`).waitFor();
			}

			await selectSchool(targetSchoolId);
			await page.reload({ waitUntil: 'domcontentloaded' });
			await expectAppDashboard(page);
			await page.locator(`[data-testid="app-shell"][data-school-id="${targetSchoolId}"]`).waitFor();
			await menu.click();
			await selectSchool(currentSchoolId);
		});
	});
}

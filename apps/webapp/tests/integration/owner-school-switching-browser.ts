import type { Response } from 'playwright';
import assert from 'node:assert/strict';
import process from 'node:process';
import { chromium } from 'playwright';
import { expectAppDashboard } from './onboarding/support/auth';
import { chooseOption, selectOptions } from './support/custom-select';
import { passwordlessApiLogin } from './support/passwordless';

async function main() {
	const base = process.env.WEBAPP_URL;
	assert(base && process.env.EDAYA_TEST_OTP_FILE, 'Run against the disposable seeded browser fixture');
	const cocody = 'sch-edaya-ci-cocody';
	const central = 'sch-edaya-central';
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		page.on('pageerror', error => console.error(error.message));
		const loginVisits: string[] = [];
		page.on('framenavigated', (frame) => {
			if (frame === page.mainFrame() && new URL(frame.url()).pathname === '/login')
				loginVisits.push(frame.url());
		});
		// Hold the real response until the intermediate screen can be inspected.
		async function holdRequest(pattern: string) {
			let release!: () => void;
			const gate = new Promise<void>((resolve) => {
				release = resolve;
			});
			await page.route(pattern, async (route) => {
				await gate;
				await route.continue();
			}, { times: 1 });
			return release;
		}
		const ownerGrants = (schoolId: string) => page.waitForResponse(response =>
			response.url().endsWith('/core/authorization/effective-grants')
			&& response.request().headers()['x-school-id'] === schoolId);
		async function assertOwner(response: Response, schoolId: string) {
			assert(response.ok(), `Could not load grants for ${schoolId}: ${response.status()}`);
			const session = await response.json();
			assert.equal(session.schoolId, schoolId);
			assert(session.grants.some((grant: { source: string }) => grant.source === 'owner'), `Expected owner authority in ${schoolId}`);
		}
		async function selectedYear(schoolId: string) {
			const shell = page.locator(`[data-testid="app-shell"][data-school-id="${schoolId}"][data-year-id]:not([data-year-id=""])`);
			await shell.waitFor();
			return shell.getAttribute('data-year-id');
		}
		async function switchTo(schoolId: string) {
			await page.getByTestId('academic-year-trigger').click();
			const schoolChoice = page.getByTestId('workspace-school-choice');
			assert.equal(await selectOptions(schoolChoice).count(), 2);
			const before = await page.getByTestId('app-shell').getAttribute('data-school-id');
			await chooseOption(schoolChoice, schoolId);
			const yearChoice = page.getByTestId('academic-year-choice');
			await selectOptions(yearChoice).nth(1).waitFor({ state: 'attached' });
			const targetYear = await selectOptions(yearChoice).evaluateAll(nodes => (nodes as HTMLOptionElement[]).find(node => node.selected)?.value);
			assert(targetYear);
			await chooseOption(yearChoice, targetYear);
			assert.equal(await page.getByTestId('app-shell').getAttribute('data-school-id'), before);
			const release = await holdRequest('**/core/authorization/effective-grants');
			const grants = ownerGrants(schoolId);
			try {
				await page.getByTestId('academic-year-apply').click();
				await page.getByTestId('app-shell-pending').waitFor();
				assert.equal(new URL(page.url()).pathname, '/dashboard');
			}
			finally {
				release();
			}
			const response = await grants;
			await assertOwner(response, schoolId);
			assert.equal(await selectedYear(schoolId), targetYear);
			return targetYear;
		}

		await passwordlessApiLogin(page, base, 'a.kone@ecole-ci.edaya.dev');
		const release = await holdRequest('**/auth/edaya/session');
		try {
			await page.goto(base, { waitUntil: 'domcontentloaded' });
			await page.getByTestId('app-shell-pending').waitFor();
			assert.equal(new URL(page.url()).pathname, '/');
			assert.equal(await page.getByTestId('auth-identifier').count(), 0);
		}
		finally {
			release();
		}
		await expectAppDashboard(page);
		const firstYear = await selectedYear(cocody);
		const secondYear = await switchTo(central);
		assert.notEqual(secondYear, firstYear, 'Switch must load the other school’s year');
		await page.reload();
		await expectAppDashboard(page);
		assert.equal(await selectedYear(central), secondYear);
		assert.equal(await switchTo(cocody), firstYear);
		assert.deepEqual(loginVisits, [], 'A valid session must never visit login during entry or switching');

		const guest = await browser.newPage();
		await guest.goto(base);
		await guest.waitForURL(url => url.pathname === '/login');
		await guest.locator('[data-testid="auth-identifier"]:visible').waitFor();
	}
	finally {
		await browser.close();
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});

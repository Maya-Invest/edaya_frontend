import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';

ensurePlaywrightChromium();
const origin = process.env.WEBAPP_URL ?? 'http://127.0.0.1:5179';
const apiOrigin = process.env.API_URL ?? 'http://127.0.0.1:19999';
assert([origin, apiOrigin].every(value => ['localhost', '127.0.0.1'].includes(new URL(value).hostname)));
const browser = await chromium.launch({ headless: true });
try {
	const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
	const pageErrors: string[] = [];
	page.on('pageerror', error => pageErrors.push(error.message));
	let campaign = { id: 'campaign', status: 'draft', academicYearId: 'year', academicPeriodId: 'period', teacherAssignmentId: 'Mathematics', teacherId: 'teacher', moderatorStaffId: undefined as string | undefined };
	let rejection = 'FAMILY_FEEDBACK_MODERATOR_CONFLICT';
	let requests = 0;
	const grants = ['FAMILY_FEEDBACK_CAMPAIGN_READ', 'FAMILY_FEEDBACK_CAMPAIGN_MANAGE', 'FAMILY_FEEDBACK_MODERATE', 'FAMILY_FEEDBACK_PUBLISH'].map(permission => ({ permission, scopes: [{ kind: 'school' }] }));
	// All API requests are intercepted: this harness cannot send notifications or mutate local/live campaigns.
	await page.route(`${apiOrigin}/**`, async route => {
		const path = new URL(route.request().url()).pathname;
		let body: unknown = [], status = 200;
		if (path.endsWith('/access-token')) body = { accessToken: 'test.header.signature', expiresAt: new Date(Date.now() + 3600000).toISOString() };
		if (path.endsWith('/session')) body = { user: { id: 'login', email: 'staff@example.test' }, session: { id: 'test-session' }, account: { id: 'login', identifiers: [] } };
		if (path.endsWith('/authorization/profiles')) body = { profiles: [{ kind: 'staff', actorId: 'staff', schoolId: 'school', schoolName: 'Test School' }] };
		if (path.endsWith('/authorization/effective-grants')) body = { kind: 'staff', actorId: 'staff', schoolId: 'school', grants };
		if (path.endsWith('/staff-members/staff')) body = { id: 'staff', schoolId: 'school', firstName: 'Test', lastName: 'Staff', subjectId: 'login' };
		if (path.endsWith('/onboarding/account-status')) body = { wizardCompleted: true, maxReachedStep: 4, schoolStepSubmitted: true, structureStepSubmitted: true };
		if (path.endsWith('/schools/school')) body = { id: 'school', name: 'Test School', shortName: 'Test', timeZone: 'UTC', type: 'k12' };
		if (path.includes('get-app-shell-counts')) body = { activeEnrollmentCountsByClass: {}, studentCount: 0, guardianCount: 0, staffCount: 0, teacherCount: 0 };
		if (path.endsWith('/list-family-feedback-campaigns')) body = [campaign];
		if (path.endsWith('/get-family-feedback-campaign')) body = campaign;
		if (path.endsWith('/preview-family-feedback-audience')) body = { eligibleCount: 0, completedCount: 0, blockers: [] };
		if (path.endsWith('/open-family-feedback-campaign')) {
			requests++;
			status = 409;
			body = { code: rejection, error: 'Business rule rejected' };
			if (rejection === 'FAMILY_FEEDBACK_LIFECYCLE_INVALID') campaign = { ...campaign, status: 'closed' };
		}
		await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
	});
	await page.addInitScript(() => { sessionStorage.setItem('edaya:auth-gate', '1'); localStorage.setItem('lang', 'en'); });
	await page.goto(`${origin}/school/family-feedback/campaign/setup`);
	const open = page.getByRole('button', { name: 'Open', exact: true });
	await open.waitFor();
	assert(await open.isDisabled());
	assert(await page.getByRole('button', { name: 'Schedule', exact: true }).isDisabled());
	await page.getByText('Choose an active moderator with permission to moderate Family feedback before opening or scheduling this campaign.', { exact: true }).waitFor();
	assert.equal(requests, 0);
	const output = process.env.EDAYA_FEEDBACK_CAPTURES;
	if (output) {
		await mkdir(output, { recursive: true });
		await page.waitForTimeout(300);
		await page.screenshot({ path: `${output}/missing-moderator.png` });
	}
	// A URL-selected confirmation is guarded as well as the header button.
	await page.goto(`${origin}/school/family-feedback/campaign/setup?modal=open`);
	const modal = page.getByTestId('confirm-modal');
	await modal.waitFor();
	assert(await modal.getByRole('button', { name: 'Open', exact: true }).isDisabled());
	assert.equal(requests, 0);
	campaign = { ...campaign, moderatorStaffId: 'moderator' };
	await page.goto(`${origin}/school/family-feedback/campaign/setup`);
	await open.waitFor();
	await open.click();
	await modal.getByRole('button', { name: 'Open', exact: true }).click();
	await page.getByText('The teacher being evaluated cannot moderate this campaign. Choose another authorized staff member.', { exact: true }).waitFor();
	assert.equal(requests, 1);
	assert(await modal.isVisible());
	rejection = 'FAMILY_FEEDBACK_LIFECYCLE_INVALID';
	await modal.getByRole('button', { name: 'Open', exact: true }).click();
	await modal.getByText('This action is unavailable for the current campaign status or dates. Review the campaign before trying again.', { exact: true }).waitFor();
	assert(await modal.getByRole('button', { name: 'Open', exact: true }).isDisabled());
	assert.equal(requests, 2);
	await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
	await page.getByRole('button', { name: 'Publish', exact: true }).waitFor();
	assert.equal(await open.count(), 0);
	assert.deepEqual(pageErrors, []);
	console.log('Family feedback UI passed: prerequisite guidance, guarded URL confirmation, specific conflict, refreshed status, and no automatic retry.');
}
finally {
	await browser.close();
}

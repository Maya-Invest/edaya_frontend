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
	let unavailable = false;
	let listReads = 0;
	let missingReads = 0;
	const historyRows = Array.from({ length: 61 }, (_, i) => ({
		id: i === 0 ? 'campaign' : `history-${i}`,
		title: i === 0 ? 'Mathematics' : `Topic ${String(i).padStart(3, '0')}`,
		status: 'draft',
		academicPeriodId: 'period',
		opensAt: null,
		closesAt: null,
	}));
	let failPageTwo = true;
	let releasePageTwo!: () => void;
	const heldPageTwo = new Promise<void>((resolve) => { releasePageTwo = resolve; });
	let secondAttempts = 0;
	let exportCount = 0;
	let denyContinuation = false;
	let holdHistory = false;
	let releaseHistory!: () => void;
	const heldHistory = new Promise<void>((resolve) => { releaseHistory = resolve; });
	const pickerQueries: string[] = [];
	const choices = Array.from({ length: 56 }, (_, i) => String(i + 1).padStart(4, '0'));
	let failSearch = true;
	let releaseSearch!: () => void;
	const delayed = new Promise<void>((resolve) => { releaseSearch = resolve; });
	const grants = ['FAMILY_FEEDBACK_CAMPAIGN_READ', 'FAMILY_FEEDBACK_CAMPAIGN_MANAGE', 'FAMILY_FEEDBACK_MODERATE', 'FAMILY_FEEDBACK_PUBLISH'].map(permission => ({ permission, scopes: [{ kind: 'school' }] }));
	// All API requests are intercepted: this harness cannot send notifications or mutate local/live campaigns.
	await page.route(`${apiOrigin}/**`, async (route) => {
		const path = new URL(route.request().url()).pathname;
		let body: unknown = []; let status = 200;
		if (path.endsWith('/access-token'))
			body = { accessToken: 'test.header.signature', expiresAt: new Date(Date.now() + 3600000).toISOString() };
		if (path.endsWith('/session'))
			body = { user: { id: 'login', email: 'staff@example.test' }, session: { id: 'test-session' }, account: { id: 'login', identifiers: [] } };
		if (path.endsWith('/authorization/profiles'))
			body = { profiles: [{ kind: 'staff', actorId: 'staff', schoolId: 'school', schoolName: 'Test School' }] };
		if (path.endsWith('/authorization/effective-grants'))
			body = { kind: 'staff', actorId: 'staff', schoolId: 'school', grants };
		if (path.endsWith('/staff-members/staff'))
			body = { id: 'staff', schoolId: 'school', firstName: 'Test', lastName: 'Staff', subjectId: 'login' };
		if (path.endsWith('/onboarding/account-status'))
			body = { wizardCompleted: true, maxReachedStep: 4, schoolStepSubmitted: true, structureStepSubmitted: true };
		if (path.endsWith('/schools/school'))
			body = { id: 'school', name: 'Test School', shortName: 'Test', timeZone: 'UTC' };
		if (path.endsWith('/academic-years/list'))
			body = [{ id: 'year', schoolId: 'school', name: '2026–2027', startDate: '2026-09-01', endDate: '2027-06-30', status: 'published' }];
		if (path.includes('get-app-shell-counts'))
			body = { activeEnrollmentCountsByClass: {}, studentCount: 0, guardianCount: 0, staffCount: 0, teacherCount: 0 };
		if (path.endsWith('/staff/feedback/history') || path.endsWith('/staff/feedback/history/export')) {
			const params = new URL(route.request().url()).searchParams;
			const q = params.get('q')?.toLowerCase() ?? '';
			const statusFilter = params.get('status');
			const matches = historyRows.map(r => r.id === campaign.id ? { ...r, status: campaign.status } : r).filter(r =>
				(!statusFilter || r.status === statusFilter) && (r.title.toLowerCase().includes(q) || r.status.includes(q)));
			if (path.endsWith('/export')) {
				exportCount++;
				body = { items: matches };
			}
			else {
				listReads++;
				if (holdHistory) await heldHistory;
				const start = Number(params.get('cursor') ?? 0);
				if (start === 30) {
					secondAttempts++;
					if (denyContinuation) status = 403;
					if (failPageTwo) { failPageTwo = false; status = 503; }
					else {
						await heldPageTwo;
					}
				}
				body = { items: matches.slice(start, start + 30), total: matches.length, nextCursor: start + 30 < matches.length ? String(start + 30) : null };
			}
		}
		if (path.endsWith('/staff/feedback/campaigns')) {
			const id = new URL(route.request().url()).searchParams.get('campaignId');
			assert(id, 'The list must use the bounded history route');
			if (id === 'missing') {
				missingReads++;
				status = unavailable ? 200 : 503;
				body = unavailable ? { items: [] } : { error: 'Temporarily unavailable' };
			}
			else {
				body = { items: [campaign] };
			}
		}
		if (path.endsWith('/preview-family-feedback-audience'))
			body = { eligibleCount: 0, completedCount: 0, blockers: [] };
		if (path.endsWith('/staff/feedback/options')) {
			const params = new URL(route.request().url()).searchParams;
			assert.equal(params.get('academicYearId'), 'year');
			const picker = params.get('picker');
			const q = params.get('q') ?? '';
			const after = params.get('after') ?? '';
			pickerQueries.push([picker, q, after].join('/'));
			if (q === 'Teacher 0055')
				await delayed;
			if (q === 'revoked' || (q === 'Teacher 0056' && failSearch)) {
				failSearch = false;
				status = q === 'revoked' ? 403 : 503;
				body = { error: 'Picker unavailable' };
			}
			else {
				const matches = (kind: string, prefix: string) => (picker === 'both' || picker === kind)
					? choices.filter(id => id > after && (prefix + id).includes(q))
					: [];
				const assignments = matches('assignments', 'Teacher ');
				const moderators = matches('moderators', 'Moderator ');
				body = {
					assignments: assignments.slice(0, 50).map(id => ({ id, teacherName: `Teacher ${id}`, subjectName: null, classGroupId: null })),
					moderators: moderators.slice(0, 50).map(id => ({ id, name: `Moderator ${id}` })),
					nextAssignment: assignments.length > 50 ? assignments[49] : null,
					nextModerator: moderators.length > 50 ? moderators[49] : null,
				};
			}
		}
		if (path.endsWith('/open-family-feedback-campaign')) {
			requests++;
			status = 409;
			body = { code: rejection, error: 'Business rule rejected' };
			if (rejection === 'FAMILY_FEEDBACK_LIFECYCLE_INVALID')
				campaign = { ...campaign, status: 'closed' };
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
	await page.goto(`${origin}/school/family-feedback/missing/setup`);
	const retry = page.getByRole('button', { name: 'Try again', exact: true });
	await retry.waitFor();
	const beforeRetry = { listReads, missingReads };
	unavailable = true;
	await retry.click();
	await page.getByText('Unavailable', { exact: true }).waitFor();
	assert.equal(listReads, beforeRetry.listReads);
	assert.equal(missingReads, beforeRetry.missingReads + 1);
	assert.equal(new URL(page.url()).pathname, '/school/family-feedback/missing/setup');
	assert.deepEqual(pickerQueries, []);
	await page.goto(`${origin}/school/family-feedback?modal=create`);
	const assignments = page.locator('[data-feedback-picker=assignments]');
	const moderators = page.locator('[data-feedback-picker=moderators]');
	const assignmentSelect = assignments.locator('button.ui-select-trigger');
	const moderatorSelect = moderators.locator('button.ui-select-trigger');
	await assignments.getByRole('button', { name: 'Show more choices' }).click();
	await assignmentSelect.click();
	await page.getByRole('option', { name: 'Teacher 0051', exact: true }).click();
	assert.deepEqual(pickerQueries, ['both//', 'assignments//0050']);
	const heldRequest = page.waitForRequest(req => new URL(req.url()).searchParams.get('q') === 'Teacher 0055');
	await assignments.getByRole('searchbox').fill('Teacher 0055');
	await heldRequest;
	await assignments.getByRole('searchbox').fill('Teacher 0056');
	await moderators.getByRole('searchbox').fill('Moderator 0053');
	await assignments.getByRole('button', { name: 'Try again' }).waitFor();
	releaseSearch();
	await moderatorSelect.click();
	await page.getByRole('option', { name: 'Moderator 0053', exact: true }).click();
	assert((await assignmentSelect.innerText()).includes('Teacher 0051'));
	await assignments.getByRole('button', { name: 'Try again' }).click();
	await assignmentSelect.click();
	assert.deepEqual((await page.getByRole('option', { name: /^Teacher / }).allTextContents()).map(text => text.trim()), ['Teacher 0056']);
	await page.getByRole('option', { name: 'Teacher 0056', exact: true }).click();
	assert((await moderatorSelect.innerText()).includes('Moderator 0053'));
	assert.equal(pickerQueries.filter(q => q === 'assignments/Teacher 0056/').length, 2);
	await assignments.getByRole('searchbox').fill('revoked');
	await assignments.waitFor({ state: 'detached' });
	assert.equal(await moderators.count(), 0);
	assert(await page.getByTestId('form-modal-submit').isDisabled());
	await page.goto(`${origin}/school/family-feedback`);
	const rows = page.locator('button[data-campaign-id]');
	await rows.first().waitFor();
	assert.equal(await rows.count(), 30);
	await page.getByText('61 campaigns', { exact: true }).waitFor();
	await page.getByTestId('collection-menu').click();
	const exported = page.waitForEvent('download');
	await page.getByRole('menuitem', { name: 'Export', exact: true }).click();
	const stream = await (await exported).createReadStream();
	const csv = [];
	for await (const chunk of stream!) csv.push(chunk);
	assert.equal(Buffer.concat(csv).toString().split('\n').length, 62);
	assert.equal(exportCount, 1);
	await page.getByTestId('list-load-more-sentinel').scrollIntoViewIfNeeded();
	const retryPage = page.getByRole('button', { name: 'Try again', exact: true });
	await retryPage.waitFor();
	assert.equal(await rows.count(), 30);
	const continued = page.waitForRequest(request => new URL(request.url()).searchParams.get('cursor') === '30');
	await retryPage.click();
	await continued;
	const search = page.getByTestId('list-search');
	await search.fill('Topic 060');
	await page.locator('[data-campaign-id="history-60"]').waitFor();
	releasePageTwo();
	await page.waitForLoadState('networkidle');
	assert.equal(secondAttempts, 2);
	assert.equal(await rows.count(), 1);
	holdHistory = true;
	await page.goto(`${origin}/school/family-feedback/campaign/setup?q=Topic%20060`, { waitUntil: 'domcontentloaded' });
	await page.getByRole('heading', { name: 'Mathematics', exact: true }).waitFor();
	assert.equal(await rows.count(), 0);
	holdHistory = false;
	releaseHistory();
	await page.locator('[data-campaign-id="history-60"]').waitFor();
	assert.equal(await rows.count(), 1);
	denyContinuation = true;
	await page.goto(`${origin}/school/family-feedback`);
	await rows.first().waitFor();
	await page.getByTestId('list-load-more-sentinel').scrollIntoViewIfNeeded();
	await rows.first().waitFor({ state: 'detached' });
	assert.equal(await rows.count(), 0);
	assert.deepEqual(pageErrors, []);
	console.log('Family feedback UI passed campaign pages, full export, search during retry, independent direct detail, grant changes, and editor workflows.');
}
finally {
	await browser.close();
}

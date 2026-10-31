import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';
import { chooseOption } from './support/custom-select';
import { createFixtureServer } from './support/fixture-server';

process.env.PUBLIC_API_URL = 'http://localhost:9999';
async function main() {
	ensurePlaywrightChromium();
	const root = resolve(import.meta.dirname, '../..');
	const output = process.env.INTEGRATION_ARTIFACT_DIR ?? resolve(root, '.focused-run/student-profile');
	mkdirSync(output, { recursive: true });
	const server = await createFixtureServer({ root }, 'student-profile', 14315, '/school/students/child/profile');
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
	page.setDefaultTimeout(15000);
	const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
	const requests: { path: string; body: any }[] = [];
	let healthRead = true; let failHealth = false; let failGuardians = false; let failHistory = false; let failStatus = false; let failPublish = false; let pending = true; let delayHealth = false; let clinicalNotes = 'Clinical note';
	let releaseHealth: (() => void) | undefined;
	const student = { id: 'child', schoolId: 'school', firstName: 'Aminata', lastName: 'Koné', sourceFullName: 'KONE Aminata Mariam', matricule: 'S-0042', nationalMatricule: 'CI-2042', birthDate: '2012-05-18', gender: 'female', nationality: 'Ivoirienne', placeOfBirth: 'Abidjan', enrollmentDate: '2025-09-01', status: 'active', email: 'student@example.test', photoUrl: '/core/files/published/content', photoAttachmentId: 'published' };
	const years = [{ id: 'year', schoolId: 'school', name: '2026–2027', startDate: '2026-09-01', endDate: '2027-06-30', status: 'published' }];
	const enrollment = { id: 'placement', schoolId: 'school', studentId: 'child', classGroupId: 'class', academicYearId: 'year', enrolledAt: '2026-09-01', status: 'active' };
	const guardian = { id: 'guardian', schoolId: 'school', firstName: 'Mariam', lastName: 'Koné', email: 'guardian@example.test', phone: '+225 0102030405', occupation: 'Enseignante' };
	const link = { id: 'link', studentId: 'child', guardianId: 'guardian', relationship: 'mother', isPrimary: true, legalGuardian: true, canPickup: true, receivesAcademicReports: true, receivesAttendanceAlerts: true, isBillingContact: false, emergencyContactPriority: 1 };
	const medical = `Full medical instructions: preserve every line.\n${'Long medical information and emergency instructions. '.repeat(15)}`;
	const png = Buffer.from(await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96; const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#DBEAFE'; ctx.fillRect(0, 0, 96, 96); ctx.fillStyle = '#2563EB'; ctx.beginPath(); ctx.arc(48, 33, 17, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(48, 90, 34, 35, 0, 0, Math.PI * 2); ctx.fill(); return canvas.toDataURL('image/png').split(',')[1]; }), 'base64');
	await page.route('http://localhost:9999/**', async (route) => {
		const path = new URL(route.request().url()).pathname;
		const input = route.request().headers()['content-type']?.includes('application/json') && route.request().postData() ? route.request().postDataJSON() : {};
		requests.push({ path, body: input });
		if (path.endsWith('/download-url'))
			return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ downloadUrl: `http://localhost:9999${path.replace('/download-url', '/content')}` }) });
		if (path.includes('/files/'))
			return route.fulfill({ contentType: 'image/png', body: png });
		let response: any = []; let status = 200;
		const grants = ['STUDENT_READ', 'STUDENT_MANAGE', 'STUDENT_HEALTH_UPDATE', 'PARENT_READ', 'PARENT_MANAGE', 'ENROLLMENT_READ', 'ENROLLMENT_MANAGE', 'STAFF_READ', 'DOCUMENT_READ', ...(healthRead ? ['STUDENT_HEALTH_READ'] : [])].map(permission => ({ permission, scopes: [{ kind: 'school' }] }));
		if (path.endsWith('/access-token'))
			response = { accessToken: 'fixture.payload.signature', expiresAt: new Date(Date.now() + 3600000).toISOString() };
		if (path.endsWith('/session'))
			response = { user: { id: 'login', email: 'secretary@example.test' }, account: { id: 'login', identifiers: [] }, session: { id: 'fixture-session' } };
		if (path.endsWith('/terms'))
			response = { enforced: false, document: null };
		if (path.endsWith('/methods'))
			response = { email: true, phone: false };
		if (path.endsWith('/authorization/profiles'))
			response = { profiles: [{ kind: 'staff', actorId: 'secretary', schoolId: 'school', schoolName: 'Oak School' }] };
		if (path.endsWith('/authorization/effective-grants'))
			response = { kind: 'staff', actorId: 'secretary', schoolId: 'school', grants };
		if (path.endsWith('/staff-members/secretary'))
			response = { id: 'secretary', schoolId: 'school', firstName: 'School', lastName: 'Secretary', subjectId: 'login', role: 'secretary' };
		if (path.endsWith('/staff-members/list'))
			response = [{ id: 'author', schoolId: 'school', firstName: 'Jean', lastName: 'Aka', role: 'staff' }];
		if (path.endsWith('/onboarding/account-status'))
			response = { wizardCompleted: true, maxReachedStep: 4, schoolStepSubmitted: true, structureStepSubmitted: true };
		if (path.includes('get-app-shell-counts'))
			response = { activeEnrollmentCountsByClass: { class: 1 }, studentCount: 1, guardianCount: 1, staffCount: 1, teacherCount: 0 };
		if (path.endsWith('/schools/school'))
			response = { id: 'school', name: 'Oak School', shortName: 'Oak', timeZone: 'Africa/Abidjan', currency: 'XOF' };
		if (path.endsWith('/academic-years/list'))
			response = years;
		if (path.endsWith('/class-groups/list'))
			response = [{ id: 'class', schoolId: 'school', academicYearId: 'year', name: '6ème 2', gradeLevelId: 'level' }];
		if (path.endsWith('/grade-levels/list'))
			response = [{ id: 'level', schoolId: 'school', name: '6ème', label: '6ème', sequenceOrder: 1 }];
		if (path.endsWith('/students/list'))
			response = JSON.stringify(input).includes('child2') ? [{ ...student, id: 'child2', firstName: 'Other', lastName: 'Student' }] : [student];
		if (path.endsWith('/students/count'))
			response = { count: 1 };
		if (path.endsWith('/enrollments/list')) { response = [JSON.stringify(input).includes('child2') ? { ...enrollment, studentId: 'child2' } : enrollment]; if (failHistory) { response = { message: 'History unavailable' }; status = 503; } }
		if (path.endsWith('/guardians/list')) { response = [guardian]; if (failGuardians) { response = { message: 'Guardian failure' }; status = 503; } }
		if (path.endsWith('/guardians/guardian'))
			response = guardian;
		if (path.endsWith('/guardians/count'))
			response = { count: 1 };
		if (path.endsWith('/guardian-links/list'))
			response = [link];
		if (path.endsWith('/student-photo-submissions/list'))
			response = pending ? [{ id: 'proposal', schoolId: 'school', studentId: 'child', attachmentId: 'proposed', status: 'pending', version: 1 }] : [];
		if (path.endsWith('/student-health-profiles/list')) {
			if (delayHealth)
				await new Promise<void>(resolve => releaseHealth = resolve);
			response = [{ id: 'health', schoolId: 'school', studentId: JSON.stringify(input).includes('child2') ? 'child2' : 'child', bloodType: 'A+', medicalConditions: medical, allergies: 'Peanuts', medications: 'Prescribed medication', emergencyProtocols: 'Contact the emergency team.', clinicalNotes, lastVisit: '2026-10-02' }];
			if (failHealth) { status = 403; response = { message: 'Restricted medical records' }; }
		}
		if (path.endsWith('/student-notes/list'))
			response = [{ id: 'note', studentId: 'child', body: 'Steady progress in class.', authorStaffId: 'author', createdAt: '2026-10-03T12:00:00Z', category: 'progress', visibility: 'staff' }];
		if (path.includes('upsert-student-health-profile')) { clinicalNotes = input.clinicalNotes; response = { id: 'health', schoolId: 'school', ...input }; }
		if (path.includes('get-student-subject-enrollments'))
			response = { studentId: 'child', placements: [enrollment], offerings: [], enrollments: [], periods: [] };
		if (path.includes('update-student-status')) {
			if (failStatus) { status = 503; response = { message: 'Save failed' }; }
			else { student.status = input.status; response = student; }
		}
		if (path.includes('review-student-photo') || path.includes('approve-student-photo') || path.includes('reject-student-photo')) {
			pending = false; if (input.decision === 'approve')
				student.photoUrl = '/core/files/proposed/content'; response = student;
		}
		if (path.includes('create-profile-photo-upload'))
			response = { attachmentId: 'replacement', uploadUrl: 'http://localhost:9999/upload-fixture', storageKey: 'fixture' };
		if (path.includes('complete-profile-photo-upload'))
			response = { id: 'replacement', status: 'ready' };
		if (path.includes('publish-student-photo')) {
			if (failPublish) { status = 503; response = { message: 'Photo publication unavailable' }; }
			else { pending = false; student.photoUrl = '/core/files/replacement/content'; response = student; }
		}
		await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) });
	});
	await page.addInitScript(() => {
		sessionStorage.setItem('edaya:auth-gate', '1'); if (!localStorage.getItem('lang'))
			localStorage.setItem('lang', 'en');
	});
	const profile = page.getByTestId('student-profile');
	try {
		console.log('Checking merged school/class profile, independent sections and legacy URLs');
		for (const prefix of ['/school/students/child', '/classes/class/students/child']) {
			await page.goto(`${server.url.replace('/school/students/child/profile', '')}${prefix}/enrollments?q=preserved`);
			await profile.waitFor();
			assert(new URL(page.url()).pathname.endsWith('/profile'));
			assert.equal(new URL(page.url()).searchParams.get('q'), 'preserved');
			await profile.getByText('Steady progress in class.', { exact: true }).waitFor();
			assert.deepEqual(await profile.locator('[data-profile-section]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-profile-section'))), ['portrait', 'health', 'personal', 'schooling', 'guardians', 'account', 'notes']);
			assert.equal(await page.getByTestId('drawer-tab-bar').getByRole('link').count(), 7);
			assert.equal(await profile.getByText('S-0042', { exact: true }).count(), 0);
			assert.equal(await profile.getByText(medical, { exact: true }).count(), 1);
			await profile.locator('[data-profile-section=portrait] img').waitFor();
			assert.equal(await profile.locator('[data-profile-section=portrait] img').count(), 1, 'Only proposed portrait is repeated in body');
			await profile.getByText('2026–2027', { exact: true }).first().waitFor();
			await page.getByTestId('student-drawer-body').screenshot({ path: resolve(output, `${prefix.startsWith('/school') ? 'school' : 'class'}-profile.png`) });
		}
		const guardians = profile.locator('[data-profile-section=guardians]');
		const guardianCard = guardians.getByRole('group', { name: `${guardian.firstName} ${guardian.lastName}`, exact: true });
		await guardianCard.getByText('Mother', { exact: true }).waitFor();
		assert.equal(await guardianCard.locator('details').count(), 0, 'Guardian card shows a relationship badge without a rights disclosure');
		assert.equal(await guardianCard.getByText('Primary guardian', { exact: true }).count(), 0);
		assert.equal(await guardians.getByText('1 results', { exact: true }).count(), 0, 'No redundant result footer');
		assert.equal(await guardianCard.getByRole('button', { name: 'Edit', exact: true }).count(), 0, 'Edit belongs to the shared row menu');
		await guardianCard.getByRole('button', { name: 'Row actions · Mariam Koné', exact: true }).click();
		await page.getByRole('menu').getByRole('menuitem', { name: 'Edit', exact: true }).click();
		const relationshipDialog = page.getByTestId('form-modal');
		await relationshipDialog.getByLabel('Primary guardian', { exact: true }).waitFor();
		assert(await relationshipDialog.getByLabel('Primary guardian', { exact: true }).isChecked(), 'Full relationship rights remain in the editing form');
		await relationshipDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
		await relationshipDialog.waitFor({ state: 'hidden' });
		console.log('Checking health text preservation and annual/progression forms in merged Profile');
		await profile.getByRole('button', { name: 'Edit health profile', exact: true }).click();
		const healthDialog = page.getByTestId('form-modal');
		assert.equal(await healthDialog.getByLabel('Chronic conditions', { exact: true }).inputValue(), medical);
		await healthDialog.getByLabel('Clinical notes', { exact: true }).fill('Updated clinical note');
		await healthDialog.getByTestId('form-modal-submit').click();
		await healthDialog.waitFor({ state: 'hidden' });
		assert.equal(requests.findLast(row => row.path.includes('upsert-student-health-profile'))?.body.medicalConditions, medical.trim(), 'Medical text is not flattened or split during edits');
		// Legacy enrollment links keep URL-backed forms functional in both origins.
		for (const prefix of ['/school/students/child', '/classes/class/students/child']) {
			await page.goto(`${new URL(server.url).origin}${prefix}/enrollments?modal=edit-annual-profile&q=preserved`);
			await page.getByTestId('form-modal').waitFor();
			assert(new URL(page.url()).pathname.endsWith('/profile'));
			assert.equal(new URL(page.url()).searchParams.get('q'), 'preserved');
			await page.getByTestId('form-modal-cancel').click();
			await page.getByTestId('form-modal').waitFor({ state: 'hidden' });
			await profile.getByRole('button', { name: 'Completion and progression', exact: true }).click();
			await page.getByTestId('form-modal').waitFor();
			await page.getByTestId('form-modal-cancel').click();
			await page.getByTestId('form-modal').waitFor({ state: 'hidden' });
		}
		// A health read failure must not blank pedagogical notes or guardians.
		failHealth = true; await page.reload(); await profile.getByText('Steady progress in class.', { exact: true }).waitFor();
		await profile.locator('[data-profile-section=health]').getByText('Access denied', { exact: false }).waitFor();
		failHealth = false; healthRead = false; const before = requests.filter(row => row.path.endsWith('/student-health-profiles/list')).length;
		await page.reload(); await profile.getByText('Steady progress in class.', { exact: true }).waitFor();
		assert.equal(await profile.locator('[data-profile-section=health]').count(), 0);
		assert.equal(requests.filter(row => row.path.endsWith('/student-health-profiles/list')).length, before, 'No medical request without the health-read grant');
		healthRead = true; failGuardians = true; await page.reload(); await profile.locator('[data-profile-section=guardians]').getByRole('button', { name: 'Try again', exact: true }).waitFor();
		failGuardians = false; await profile.locator('[data-profile-section=guardians]').getByRole('button', { name: 'Try again', exact: true }).click();
		await profile.getByRole('button', { name: 'Mariam Koné', exact: true }).waitFor();
		failHistory = true; await page.reload();
		await profile.locator('[data-profile-section=schooling]').getByRole('button', { name: 'Try again', exact: true }).last().waitFor();
		await profile.getByText('Steady progress in class.', { exact: true }).waitFor();
		failHistory = false; await profile.locator('[data-profile-section=schooling]').getByRole('button', { name: 'Try again', exact: true }).last().click();
		await page.getByTestId('student-placement-history').waitFor();
		// Status changes remain explicit; a failed save preserves the draft for retry.
		await page.getByTestId('student-drawer-body').evaluate(element => element.scrollTop = 0);
		await page.locator('.ui-student-drawer-context').getByRole('button', { name: 'More actions', exact: true }).click();
		await page.getByRole('button', { name: 'Change status', exact: true }).click();
		const statusDialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Change status', exact: true }) });
		await chooseOption(statusDialog.locator('#student-status'), 'inactive');
		assert.equal(student.status, 'active'); failStatus = true;
		await statusDialog.getByTestId('form-modal-submit').click(); await statusDialog.getByTestId('form-modal-submit').waitFor({ state: 'visible' });
		assert.equal(student.status, 'active'); failStatus = false;
		await statusDialog.getByTestId('form-modal-submit').click(); await statusDialog.waitFor({ state: 'hidden' });
		assert.equal(student.status, 'inactive');
		// School/class source and guardian identity survive contextual Back.
		await profile.getByRole('button', { name: 'Mariam Koné', exact: true }).click();
		await page.getByRole('button', { name: 'Back', exact: true }).waitFor();
		await page.getByRole('button', { name: 'Back', exact: true }).click();
		await profile.getByRole('button', { name: 'Mariam Koné', exact: true }).waitFor();
		assert(await profile.getByRole('button', { name: 'Mariam Koné', exact: true }).evaluate(element => element === document.activeElement));
		console.log('Checking portrait approval, rejection and replacement');
		await page.getByTestId('student-drawer-body').evaluate(element => element.scrollTop = 0);
		await profile.getByRole('button', { name: 'Approve', exact: true }).click();
		await page.getByTestId('confirm-submit').click();
		await page.getByTestId('confirm-modal').waitFor({ state: 'hidden' });
		assert.equal(pending, false);
		await profile.getByText('No portrait awaiting review.', { exact: true }).waitFor();
		pending = true; await page.reload(); await profile.getByRole('button', { name: 'Reject', exact: true }).click();
		const reject = page.getByTestId('student-photo-reject-modal');
		await reject.getByRole('textbox').fill('Please upload a clearer portrait.');
		await reject.getByRole('button', { name: 'Reject', exact: true }).click();
		await reject.waitFor({ state: 'hidden' });
		assert.equal(requests.findLast(row => row.path.includes('review-student-photo'))?.body.rejectionReason, 'Please upload a clearer portrait.');
		await profile.locator('input[type=file]').setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: png });
		const crop = page.getByTestId('profile-photo-crop-dialog');
		failPublish = true;
		const failedPublication = page.waitForResponse(response => response.url().includes('publish-student-photo') && response.status() === 503);
		await crop.getByRole('button', { name: 'Use this photo', exact: true }).click();
		await failedPublication;
		assert(await crop.isVisible(), 'A failed publication preserves the crop for retry');
		failPublish = false;
		await crop.getByRole('button', { name: 'Use this photo', exact: true }).click();
		await crop.waitFor({ state: 'hidden' });
		assert(requests.some(row => row.path.includes('publish-student-photo')), 'Replacement uses existing crop/upload/publication workflow');
		assert.equal(await profile.locator('[data-profile-section=portrait] img').count(), 0, 'Published portrait is never duplicated in body');
		// Delay a medical response across navigation: the previous student cannot seed the next one.
		delayHealth = true;
		await page.goto(`${new URL(server.url).origin}/school/students/child/profile`);
		await page.waitForFunction(() => !!document.querySelector('[data-testid=student-profile]'));
		for (let attempt = 0; !releaseHealth && attempt < 100; attempt++) await page.waitForTimeout(10);
		assert(releaseHealth, 'Delayed medical request was issued');
		delayHealth = false;
		await page.goto(`${new URL(server.url).origin}/school/students/child2/profile`);
		releaseHealth(); releaseHealth = undefined;
		await profile.locator('[data-profile-section=health]').getByText('A+', { exact: true }).waitFor();
		assert((await page.locator('.ui-student-identity').innerText()).includes('Other Student'));
		guardian.email = 'mariam.kone.long.contact.address@ecole-abidjan.example.test';
		console.log('Checking responsive Profile with full medical text and compact guardian rows');
		for (const language of ['en', 'fr']) {
			for (const width of [360, 768, 1440]) {
				for (const scale of [1, 2]) {
					await page.setViewportSize({ width, height: 900 });
					await page.goto(`${new URL(server.url).origin}/school/students`);
					await page.getByTestId('language-selector').click(); await page.getByTestId(`language-option-${language}`).click();
					await page.goto(`${new URL(server.url).origin}/school/students/child/profile`);
					await profile.waitFor();
					await page.evaluate(scale => document.documentElement.style.fontSize = `${16 * scale}px`, scale);
					await profile.locator('[data-profile-section=notes]').getByText('Steady progress in class.', { exact: true }).waitFor();
					await page.evaluate(() => document.fonts.ready);
					const body = page.getByTestId('student-drawer-body');
					assert(await body.evaluate(element => element.scrollWidth <= element.clientWidth), `${language}/${width}/${scale}: no horizontal profile overflow`);
					await body.evaluate(element => element.scrollTop = 0);
					await page.screenshot({ path: resolve(output, `${language}-${width}-${scale}.png`) });
					await guardianCard.scrollIntoViewIfNeeded();
					assert(await guardianCard.evaluate(element => element.scrollWidth <= element.clientWidth), `${language}/${width}/${scale}: guardian card reflows without horizontal overflow`);
					await guardianCard.getByText(guardian.email, { exact: true }).waitFor();
					await guardianCard.getByTestId('guardian-relationship-badge').getByText(language === 'en' ? 'Mother' : 'Mère', { exact: true }).waitFor();
					const detailPositions = await guardianCard.getByTestId('guardian-contact-details').locator(':scope > div').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
					assert.equal(detailPositions.length, 3);
					assert(Math.max(...detailPositions) - Math.min(...detailPositions) < 1, 'All three contact facts occupy the second row');
					assert.equal(await guardians.getByText(/1 (results|résultats)/).count(), 0);
					const identity = await guardianCard.getByRole('button', { name: 'Mariam Koné', exact: true }).boundingBox();
					const contact = await guardianCard.getByText(guardian.email, { exact: true }).boundingBox();
					assert(identity && contact && contact.y >= identity.y + identity.height, 'Contact details follow guardian identity');
					await guardians.screenshot({ path: resolve(output, `guardians-${language}-${width}-${scale}.png`) });
					await body.evaluate(element => element.scrollTop = element.scrollHeight);
					assert(await page.getByRole('button', { name: language === 'en' ? 'Close' : 'Fermer', exact: true }).first().isVisible());
				}
			}
		}
		assert.deepEqual(errors, []);
		writeFileSync(resolve(output, 'capture-conditions.json'), JSON.stringify({ tokenVersion: JSON.parse(readFileSync(resolve(root, '../../design-system/tokens.json'), 'utf8')).version, locales: ['en', 'fr'], viewportWidths: [360, 768, 1440], textScales: [1, 2], source: 'execution.json', data: 'isolated API fixtures with production school/class drawers' }, null, 2));
		console.log('PASS: merged school/class profile, legacy URLs, independent permissions/errors/retry, explicit status changes, guardian Back/focus and FR/EN 200% text');
	}
	catch (error) {
		await page.screenshot({ path: resolve(output, 'failure.png') });
		writeFileSync(resolve(output, 'failure.txt'), `${String(error)}\n${errors.join('\n')}\n${await page.locator('body').innerText()}\n${JSON.stringify(requests.slice(-25), null, 2)}`);
		throw error;
	}
	finally { await browser.close(); await server.close(); }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });

import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { ensurePlaywrightChromium } from '../../scripts/playwright-browsers';
import { chooseOption } from './support/custom-select';
import { checkStudentReportCards } from './support/student-report-card-checks';
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
	const errors: string[] = []; page.on('pageerror', error => errors.push(error.stack ?? error.message));
	const requests: { path: string; body: any }[] = [];
	const fixture = { newHealth: undefined as Record<string, unknown> | undefined, releaseHealth: undefined as (() => void) | undefined, releaseNotes: undefined as (() => void) | undefined, holdPlacementRead: false, releasePlacementRead: undefined as (() => void) | undefined, assignmentResult: 'success' as 'fail' | 'conflict' | 'success', hasPlacement: true, previousPlacements: false, studentManage: true, emptyHealth: false, healthRead: true, enrollmentRead: true, enrollmentManage: true, guardianCount: 2, failHealth: 0, failGuardians: false, failHistory: false, failStatus: false, failPublish: false, pending: true, delayHealth: false, delayNotes: false };
	const clinicalNotes = 'Clinical note';
	const lastVisit = '2026-10-02T15:45:00.000Z';
	const student = { id: 'child', schoolId: 'school', firstName: 'Aminata', lastName: 'Koné', sourceFullName: 'KONE Aminata Mariam', identifier: 'S-0042', globalIdentifier: 'CI-2042', birthDate: '2012-05-18', gender: 'female', nationality: 'Ivoirienne', placeOfBirth: 'Abidjan', enrollmentDate: '2025-09-01', status: 'active', email: 'student@example.test', photoUrl: '/core/files/published/content', photoAttachmentId: 'published' };
	const years = [{ id: 'old-year', schoolId: 'school', name: '2025–2026', startDate: '2025-09-01', endDate: '2026-06-30', status: 'archived' }, { id: 'year', schoolId: 'school', name: '2026–2027', startDate: '2026-09-01', endDate: '2027-06-30', status: 'published' }];
	const enrollment = { id: 'placement', enrollmentIndex: 1, schoolId: 'school', studentId: 'child', classGroupId: 'class', academicYearId: 'year', enrolledAt: '2026-09-01', status: 'active' };
	const guardian = { id: 'guardian', schoolId: 'school', firstName: 'Mariam', lastName: 'Koné', email: 'guardian@example.test', phone: '+225 0102030405', occupation: 'Enseignante' };
	const link = { id: 'link', studentId: 'child', guardianId: 'guardian', relationship: 'mother', isPrimary: true, legalGuardian: true, canPickup: true, receivesAcademicReports: true, receivesAttendanceAlerts: true, isBillingContact: false, emergencyContactPriority: 1 };
	const medical = `Full medical instructions: preserve every line.\n${'Long medical information and emergency instructions. '.repeat(15)}`;
	const png = Buffer.from(await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96; const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#DBEAFE'; ctx.fillRect(0, 0, 96, 96); ctx.fillStyle = '#2563EB'; ctx.beginPath(); ctx.arc(48, 33, 17, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(48, 90, 34, 35, 0, 0, Math.PI * 2); ctx.fill(); return canvas.toDataURL('image/png').split(',')[1]; }), 'base64');
	await page.route('http://localhost:9999/**', async (route) => {
		const path = new URL(route.request().url()).pathname;
		const input = route.request().headers()['content-type']?.includes('application/json') && route.request().postData() ? route.request().postDataJSON() : {};
		requests.push({ path, body: input });
		if (path.includes('/core/files/')) {
			const headers = route.request().headers();
			if (!headers.authorization || headers['x-school-id'] !== 'school' || headers['x-actor-id'] !== 'secretary' || headers['x-actor-kind'] !== 'staff')
				return route.fulfill({ status: 403 });
			if (path.endsWith('/download-url'))
				return route.fulfill({ json: { downloadUrl: `http://localhost:9999/core/files/memory/${path.split('/')[3]}` } });
			if (path.startsWith('/core/files/memory/'))
				return route.fulfill({ contentType: 'image/png', body: png });
			return route.fulfill({ status: 404 });
		}
		let response: any = []; let status = 200;
		const grants = ['STUDENT_READ', ...(fixture.studentManage ? ['STUDENT_MANAGE'] : []), 'REPORT_CARD_GENERATE', 'DOCUMENT_VOID', 'STUDENT_HEALTH_UPDATE', 'PARENT_READ', 'PARENT_MANAGE', ...(fixture.enrollmentRead ? ['ENROLLMENT_READ'] : []), ...(fixture.enrollmentManage ? ['ENROLLMENT_MANAGE'] : []), 'STAFF_READ', 'DOCUMENT_READ', ...(fixture.healthRead ? ['STUDENT_HEALTH_READ'] : [])].map(permission => ({ permission, scopes: fixture.previousPlacements && !fixture.hasPlacement && permission === 'ENROLLMENT_MANAGE' ? [{ kind: 'class_group', classGroupId: 'class' }] : [{ kind: 'school' }] }));
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
		if (path.endsWith('/class-groups/list') && fixture.previousPlacements && !input.id) {
			response.push({ ...response[0], id: 'other-year-class', academicYearId: 'old-year', name: 'Old year' },
				{ ...response[0], id: 'other-class', name: 'Other class' });
		}
		if (path.endsWith('/grade-levels/list'))
			response = [{ id: 'level', schoolId: 'school', name: '6ème', shortName: '6ème', sequenceOrder: 1 }];
		if (path.endsWith('/students/list')) {
			const secondStudent = { ...student, id: 'child2', firstName: 'Other', lastName: 'Student' };
			const ids = input.id?.$in ?? (input.id ? [input.id] : []);
			response = [student, secondStudent].filter(row => !ids.length || ids.includes(row.id));
		}
		if (path.endsWith('/students/count'))
			response = { count: 2 };
		if (path.endsWith('/enrollments/list')) {
			const ids = input.studentId?.$in ?? (input.studentId ? [input.studentId] : []);
			response = [enrollment, { ...enrollment, id: 'placement2', studentId: 'child2' }].filter(row => !ids.length || ids.includes(row.studentId));
			if (ids.length === 1 && ids[0] === student.id && !input.status) {
				if (fixture.holdPlacementRead && !fixture.releasePlacementRead) await new Promise<void>(resolve => { fixture.releasePlacementRead = resolve; });
				response = fixture.hasPlacement ? [enrollment] : [];
				if (response.length && enrollment.enrolledAt === '') response[0] = { ...response[0], enrolledAt: null, createdAt: '2026-10-10' };
				if (fixture.previousPlacements) response.push(
					{ ...enrollment, id: 'older', academicYearId: 'old-year', status: 'closed', endReason: 'completed', enrolledAt: '2025-09-01', endedAt: '2026-06-30' },
					{ ...enrollment, id: 'old', status: 'closed', endReason: 'transferred', enrolledAt: '2026-08-15', endedAt: '2026-09-01', progressionNotes: 'Recorded placement note.' });
			}
			if (fixture.failHistory && ids.length === 1 && ids[0] === student.id) {
				response = { message: 'History unavailable' };
				status = 503;
			}
		}
		if (path.endsWith('/transfer-student')) {
			enrollment.id = input.nextEnrollmentId;
			enrollment.classGroupId = input.nextClassGroupId;
			response = enrollment;
		}
		if (path.endsWith('/enroll-student')) {
			if (fixture.assignmentResult === 'fail') status = 503;
			else {
				fixture.hasPlacement = true;
				if (fixture.assignmentResult === 'conflict') status = 409;
				else enrollment.id = input.id;
			}
			response = status === 200 ? enrollment : { message: 'Unable to assign class' };
		}
		if (path.endsWith('/guardians/list')) {
			response = Array.from({ length: fixture.guardianCount }, (_, i) => i ? { ...guardian, id: `guardian-${i}`, firstName: `Guardian ${i}` } : guardian);
			if (fixture.failGuardians) { response = { message: 'Guardian failure' }; status = 503; }
		}
		if (path.endsWith('/guardians/guardian'))
			response = guardian;
		if (path.endsWith('/guardians/count'))
			response = { count: 1 };
		if (path.endsWith('/guardian-links/list'))
			response = Array.from({ length: fixture.guardianCount }, (_, i) => i ? { ...link, id: `link-${i}`, guardianId: `guardian-${i}` } : link);
		if (path.endsWith('/student-photo-submissions/list'))
			response = fixture.pending ? [{ id: 'proposal', schoolId: 'school', studentId: 'child', attachmentId: 'proposed', status: 'pending', version: 1 }] : [];
		if (path.endsWith('/student-health-profiles/list')) {
			if (fixture.delayHealth)
				await new Promise<void>(resolve => fixture.releaseHealth = resolve);
			response = [{ id: 'health', schoolId: 'school', studentId: JSON.stringify(input).includes('child2') ? 'child2' : 'child', bloodType: 'A+', medicalConditions: medical, allergies: 'Peanuts', medications: 'Prescribed medication', emergencyProtocols: 'Contact the emergency team.', clinicalNotes, lastVisit }];
			if (fixture.emptyHealth) response = fixture.newHealth ? [fixture.newHealth] : [];
			if (fixture.failHealth) { status = fixture.failHealth; response = { message: 'Restricted medical records' }; }
		}
		if (path.endsWith('/student-notes/list')) {
			if (fixture.delayNotes) await new Promise<void>(resolve => fixture.releaseNotes = resolve);
			response = [{ id: 'note', studentId: 'child', body: 'Steady progress in class.', authorStaffId: 'author', createdAt: '2026-10-03T12:00:00Z', category: 'progress', visibility: 'staff' }];
		}
		if (path.includes('upsert-student-health-profile')) { response = { id: 'health', schoolId: 'school', ...input }; if (fixture.emptyHealth) fixture.newHealth = response; }
		if (path.endsWith('/list-document-templates')) {
			response = [
				['student-id-card.v1', 'Student card', 'Carte scolaire'],
				['schooling-certificate.v1', 'Certificate', 'Certificat'],
				['enrollment-record.v1', 'Enrollment record', 'Fiche d’inscription'],
				['withdrawal-certificate.v1', 'Withdrawal certificate', 'Certificat de radiation'],
				['annual-report-card.v1', 'Annual report', 'Bulletin annuel'],
			].map(([templateKey, en, fr]) => ({ templateKey, titles: { en, fr } }));
		}
		if (path.endsWith('/get-document-issuance') && input.id === 'requested')
			response = { id: 'requested', status: 'failed', failureCode: 'FIXTURE_RENDERER_OFFLINE' };
		if (path.endsWith('/request-document-issuance'))
			response = { id: 'requested', ...input, status: 'requested' };
		if (path.endsWith('/list-document-issuances')) {
			response = ['failed', 'ready'].map((status, index) => ({
				id: `copy-${index}`, templateKey: 'schooling-certificate.v1', status,
				createdAt: `2026-10-0${index+1}T00:00:00Z`, locale: 'fr', studentId: 'child', academicYearId: 'year',
			}));
		}
		if (path.includes('get-student-subject-enrollments'))
			response = { studentId: 'child', placements: [enrollment], offerings: [], enrollments: [], periods: [] };
		if (path.includes('update-student-status')) {
			if (fixture.failStatus) { status = 503; response = { message: 'Save failed' }; }
			else { student.status = input.status; response = student; }
		}
		if (path.includes('review-student-photo') || path.includes('approve-student-photo') || path.includes('reject-student-photo')) {
			fixture.pending = false; if (input.decision === 'approve')
				student.photoUrl = '/core/files/proposed/content'; response = student;
		}
		if (path.includes('create-profile-photo-upload'))
			response = { attachmentId: 'replacement', uploadUrl: 'http://localhost:9999/upload-fixture', storageKey: 'fixture' };
		if (path.includes('complete-profile-photo-upload'))
			response = { id: 'replacement', status: 'ready' };
		if (path.includes('publish-student-photo')) {
			if (fixture.failPublish) { status = 503; response = { message: 'Photo publication unavailable' }; }
			else { fixture.pending = false; student.photoUrl = '/core/files/replacement/content'; response = student; }
		}
		await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) });
	});
	await page.addInitScript(() => {
		sessionStorage.setItem('edaya:auth-gate', '1'); if (!localStorage.getItem('lang'))
			localStorage.setItem('lang', 'en');
	});
	const profile = page.getByTestId('student-profile');
	try {
		await checkStudentReportCards(page, new URL(server.url).origin, output);
		if (process.env.REPORT_CARD_ONLY) { assert.deepEqual(errors, []); return; }
		const tabs = page.getByTestId('drawer-tab-bar');
		const enrollmentTab = page.getByTestId('student-enrollment');
		const placementDate = page.getByTestId('student-placement-date');
		const historyPopup = page.getByTestId('student-placement-history');
		const overflow = page.locator('.ui-student-identity').getByRole('button', { name: 'More actions', exact: true });
		console.log('Checking separate Profile and Enrollment tabs in both drawers');
		for (const prefix of ['/school/students/child', '/classes/class/students/child']) {
			await page.goto(`${new URL(server.url).origin}${prefix}/profile?q=preserved#schooling`);
			await page.waitForURL(url => url.pathname === `${prefix}/enrollments`);
			await placementDate.getByText('Enrolled Sep 1, 2026', { exact: true }).waitFor();
			assert.equal(new URL(page.url()).searchParams.get('q'), 'preserved');
			assert.deepEqual(await tabs.getByRole('link').allTextContents().then(labels => labels.map(label => label.trim())), ['Profile', 'Enrollment', 'Attendance', 'Grades', 'Report card', 'Incidents', 'Finance', 'Documents']);
			assert.equal(await tabs.getByRole('link', { name: 'Enrollment' }).getAttribute('aria-current'), 'page');
			assert.equal(new URL(await tabs.getByRole('link', { name: 'Enrollment' }).getAttribute('href') ?? '', page.url()).pathname, `${prefix}/enrollments`);
			const count = requests.filter(row => row.path.includes('get-student-subject-enrollments')).length;
			await tabs.getByRole('link', { name: 'Profile', exact: true }).click();
			await profile.getByText('Steady progress in class.', { exact: true }).waitFor();
			assert.equal(requests.filter(row => row.path.includes('get-student-subject-enrollments')).length, count);
			assert.deepEqual(await profile.locator('[data-profile-section]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-profile-section'))), ['portrait', 'personal', 'health', 'guardians', 'account', 'notes']);
			await profile.locator('[data-profile-section=health]').getByText('A+').waitFor();
			assert.deepEqual(await profile.locator('[data-profile-section=health] .ui-drawer-field-label').allTextContents(), ['Blood type', 'Allergies', 'Medications', 'Chronic conditions']);
			assert.equal(await profile.getByText('S-0042', { exact: true }).count(), 0);
			assert.equal(await profile.getByText(medical, { exact: true }).count(), 1);
			await page.waitForFunction(() => ['.ui-student-identity img', '[data-profile-section=portrait] img']
				.every(selector => (document.querySelector<HTMLImageElement>(selector)?.naturalWidth ?? 0) > 0));
			assert.equal(await profile.locator('[data-profile-section=portrait] img').count(), 1, 'Only proposed portrait is repeated in body');
			const photoBefore = await page.locator('.ui-student-identity img').getAttribute('src');
			const photoReads = () => requests.filter(row => row.path === '/core/files/published/download-url').length;
			const readsBefore = photoReads();
			const placementReads = requests.filter(row => row.path.endsWith('/enrollments/list')).length;
			await tabs.getByRole('link', { name: 'Enrollment', exact: true }).click();
			await placementDate.getByText('Enrolled Sep 1, 2026', { exact: true }).waitFor();
			await page.waitForFunction(() => (document.querySelector<HTMLImageElement>('.ui-student-identity img')?.naturalWidth ?? 0) > 0);
			assert.equal(await page.locator('.ui-student-identity img').getAttribute('src'), photoBefore, 'Switching tabs keeps the published portrait');
			assert.equal(photoReads(), readsBefore, 'Switching tabs does not request the portrait again');
			assert.equal(requests.filter(row => row.path.endsWith('/enrollments/list')).length, placementReads);
			assert.equal(await page.locator('.ui-student-identity').getByText('2026–2027', { exact: true }).count(), 0);
			await tabs.getByRole('link', { name: 'Profile', exact: true }).click();
			await profile.getByRole('button', { name: 'Mariam Koné', exact: true }).click();
			await page.getByRole('button', { name: 'Back', exact: true }).click();
			const guardianLink = profile.getByRole('button', { name: 'Mariam Koné', exact: true });
			await guardianLink.waitFor();
			await page.waitForFunction(() => document.activeElement?.getAttribute('data-guardian-id') === 'guardian');
			assert.equal(new URL(page.url()).pathname, `${prefix}/profile`);
			assert.equal(new URL(page.url()).searchParams.get('q'), 'preserved');
			await page.getByTestId('student-drawer-body').screenshot({ path: resolve(output, `${prefix.startsWith('/school') ? 'school' : 'class'}-profile.png`) });
		}
		for (const prefix of ['/school/students/child', '/classes/class/students/child']) {
			await page.goto(`${new URL(server.url).origin}${prefix}/documents`);
			const unissued = page.locator('[data-document-type="student-id-card.v1"]');
			await unissued.getByText('Not issued').waitFor();
			await unissued.getByRole('button').press('Enter');
			await page.getByTestId('document-generate').click();
			await page.getByTestId('form-modal').getByText('Student card', { exact: true }).waitFor();
			await page.getByTestId('form-modal-cancel').click();
			for (const key of ['schooling-certificate.v1', 'enrollment-record.v1', 'withdrawal-certificate.v1'])
				assert.equal(await page.locator(`[data-document-type="${key}"]`).count(), 1);
			const certificate = page.locator('[data-document-type="schooling-certificate.v1"]');
			await certificate.getByRole('button').click();
			await page.getByTestId('document-download-copy-1').waitFor();
			assert(await page.getByTestId('document-generate').isEnabled());
			await page.getByTestId('document-generate').click();
			await page.getByTestId('form-modal-submit').click();
			await page.getByTestId('form-modal').waitFor({ state: 'hidden' });
			const issuance = requests.findLast(row => row.path.endsWith('/request-document-issuance'))?.body;
			assert.equal(issuance.sourceId, enrollment.id);
			assert.equal(issuance.academicYearId, 'year');
			await certificate.getByRole('button').click();
			await page.getByRole('menuitem', { name: 'View history' }).click();
			await certificate.locator('[data-issuance-id="copy-0"]').getByRole('button').click();
			await page.getByRole('menuitem', { name: 'Retry', exact: true }).waitFor();
			await page.keyboard.press('Escape');
			await page.locator('[data-document-type="annual-report-card.v1"]').getByRole('button').click();
			await page.getByTestId('annual-report-card-open').click();
			await page.getByTestId('form-modal').waitFor();
			await page.goto(`${new URL(server.url).origin}${prefix}/profile`);
			await profile.getByRole('button', { name: 'Link guardian', exact: true }).click();
			await page.getByTestId('form-modal').waitFor();
			await page.getByTestId('form-modal-cancel').click();
		}
		fixture.studentManage = false;
		await page.reload();
		await page.locator('.ui-student-identity').getByRole('button', { name: 'More actions' }).click();
		await page.getByRole('button', { name: 'Change class', exact: true }).waitFor();
		assert.equal(await page.getByRole('button', { name: 'Edit profile', exact: true }).count(), 0);
		fixture.studentManage = true;
		fixture.emptyHealth = true;
		await page.reload();
		const emptyHealth = profile.locator('[data-profile-section=health]');
		await emptyHealth.getByText('Not provided', { exact: true }).first().waitFor();
		assert.equal(await emptyHealth.getByText('Not provided', { exact: true }).count(), 4);
		await emptyHealth.getByRole('button').click();
		await page.getByTestId('form-modal').getByLabel('Blood type').fill('O+');
		await page.getByTestId('form-modal-submit').click();
		await page.getByTestId('form-modal').waitFor({ state: 'hidden' });
		await page.reload();
		await emptyHealth.getByText('O+', { exact: true }).waitFor();
		fixture.emptyHealth = false;
		await page.reload();
		const guardians = profile.locator('[data-profile-section=guardians]');
		for (const count of [0, 2, 3]) {
			fixture.guardianCount = count;
			await page.reload();
			await guardians.getByRole('heading', { name: `Guardians · ${count}` }).waitFor();
			assert.equal(await guardians.locator('[data-guardian-id]').count(), count);
			assert.equal(await guardians.locator('input').count(), 0);
		}
		const guardianCard = guardians.getByRole('group', { name: `${guardian.firstName} ${guardian.lastName}`, exact: true });
		await guardianCard.getByText('Mother', { exact: true }).waitFor();
		assert.equal(await guardianCard.locator('details').count(), 0, 'Guardian card shows a relationship badge without a rights disclosure');
		assert.equal(await guardianCard.getByText('Primary guardian', { exact: true }).count(), 0);
		assert.equal(await guardians.getByText(`${fixture.guardianCount} results`, { exact: true }).count(), 0, 'No redundant result footer');
		assert.equal(await guardianCard.getByRole('button', { name: 'Edit', exact: true }).count(), 0, 'Edit belongs to the shared row menu');
		await guardianCard.getByRole('button', { name: 'Row actions · Mariam Koné', exact: true }).click();
		await page.getByRole('menu').getByRole('menuitem', { name: 'Edit', exact: true }).click();
		const relationshipDialog = page.getByTestId('form-modal');
		await relationshipDialog.getByLabel('Primary guardian', { exact: true }).waitFor();
		assert(await relationshipDialog.getByLabel('Primary guardian', { exact: true }).isChecked(), 'Full relationship rights remain in the editing form');
		await relationshipDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
		await relationshipDialog.waitFor({ state: 'hidden' });
		console.log('Checking health text preservation and annual/progression forms in Enrollment');
		await profile.getByRole('button', { name: 'Edit health profile', exact: true }).click();
		const healthDialog = page.getByTestId('form-modal');
		assert.equal(await healthDialog.getByLabel('Chronic conditions', { exact: true }).inputValue(), medical);
		assert.deepEqual(await healthDialog.locator('form label').allTextContents(), ['Blood type', 'Allergies', 'Medications', 'Chronic conditions']);
		await healthDialog.getByLabel('Blood type', { exact: true }).fill('B+');
		await healthDialog.getByTestId('form-modal-submit').click();
		await healthDialog.waitFor({ state: 'hidden' });
		assert.equal(requests.findLast(row => row.path.includes('upsert-student-health-profile'))?.body.medicalConditions, medical.trim(), 'Medical text is not flattened or split during edits');
		const savedHealth = requests.findLast(row => row.path.includes('upsert-student-health-profile'))?.body;
		assert.equal(savedHealth.bloodType, 'B+');
		assert.equal(savedHealth.clinicalNotes, clinicalNotes);
		assert.equal(savedHealth.emergencyProtocols, 'Contact the emergency team.');
		assert.equal(savedHealth.lastVisit, lastVisit);
		// Legacy enrollment links keep URL-backed forms functional in both origins.
		for (const prefix of ['/school/students/child', '/classes/class/students/child']) {
			await page.goto(`${new URL(server.url).origin}${prefix}/profile?modal=edit-annual-profile&q=preserved`);
			await page.getByTestId('form-modal').waitFor();
			assert(new URL(page.url()).pathname.endsWith('/enrollments'));
			assert.equal(new URL(page.url()).searchParams.get('q'), 'preserved');
			await page.getByTestId('form-modal-cancel').click();
			await page.getByTestId('form-modal').waitFor({ state: 'hidden' });
			await page.goto(`${new URL(server.url).origin}${prefix}/profile?modal=enrollment-progression&modalTarget=placement`);
			await placementDate.getByText('Enrolled Sep 1, 2026', { exact: true }).waitFor();
			assert.equal(await page.getByTestId('form-modal').count(), 0);
			assert.equal(await enrollmentTab.locator('#class-history').count(), 0);
			await overflow.click();
			assert.equal(await page.getByRole('button', { name: 'Placement history', exact: true }).count(), 0);
			await page.keyboard.press('Escape');
			fixture.previousPlacements = true;
			fixture.studentManage = false;
			fixture.enrollmentManage = false;
			await page.reload();
			await placementDate.getByText('Enrolled Sep 1, 2026', { exact: true }).waitFor();
			await overflow.press('Enter');
			assert.equal(await page.getByRole('button', { name: 'Change class', exact: true }).count(), 0);
			assert.equal(await page.getByRole('button', { name: 'Edit profile', exact: true }).count(), 0);
			await page.getByRole('button', { name: 'Placement history', exact: true }).press('Enter');
			await historyPopup.getByRole('heading', { name: 'Placement history · Aminata Koné', exact: true }).waitFor();
			assert.deepEqual(await historyPopup.locator('[data-placement-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-placement-id'))), [enrollment.id, 'old', 'older']);
			assert(await historyPopup.getByText('2025–2026', { exact: true }).isVisible());
			assert(await historyPopup.getByText('Recorded placement note.', { exact: true }).isVisible());
			await page.goBack();
			await historyPopup.waitFor({ state: 'hidden' });
			await page.goForward();
			await historyPopup.waitFor();
			await page.keyboard.press('Escape');
			await historyPopup.waitFor({ state: 'hidden' });
			await overflow.waitFor();
			assert(await overflow.evaluate(element => element === document.activeElement));
			enrollment.enrolledAt = '';
			await page.reload();
			await placementDate.getByText('Enrollment date not provided', { exact: true }).waitFor();
			enrollment.enrolledAt = '2026-09-01';
			fixture.studentManage = true;
			fixture.enrollmentManage = true;
			fixture.hasPlacement = false;
			fixture.holdPlacementRead = true;
			await page.reload({ waitUntil: 'domcontentloaded' });
			const deadline = Date.now() + 15000;
			while (!fixture.releasePlacementRead && Date.now() < deadline) await page.waitForTimeout(20);
			assert(fixture.releasePlacementRead);
			assert.equal(await page.getByRole('button', { name: 'Assign class', exact: true }).count(), 0);
			fixture.holdPlacementRead = false;
			fixture.releasePlacementRead();
			fixture.releasePlacementRead = undefined;
			await placementDate.getByText('No active class placement', { exact: true }).waitFor();
			await overflow.click();
			await page.getByRole('button', { name: 'Assign class', exact: true }).click();
			const form = page.getByTestId('form-modal');
			await form.getByRole('heading', { name: 'Assign class' }).waitFor();
			assert(await form.getByTestId('form-modal-submit').isDisabled());
			await form.locator('[aria-haspopup=listbox]').click();
			await page.getByRole('option').first().waitFor();
			assert.equal(await page.getByRole('option').count(), 1);
			await page.getByRole('option').click();
			fixture.assignmentResult = 'fail';
			await form.getByTestId('form-modal-submit').click();
			await form.getByRole('alert').waitFor();
			fixture.assignmentResult = prefix.startsWith('/classes') ? 'conflict' : 'success';
			await form.getByTestId('form-modal-submit').click();
			if (fixture.assignmentResult === 'conflict') {
				await form.getByText(/^Current class:/i).waitFor();
				assert(await form.getByTestId('form-modal-submit').isDisabled());
				await form.getByTestId('form-modal-cancel').click();
			}
			await form.waitFor({ state: 'hidden' });
			await page.reload();
			await placementDate.getByText('Enrolled Sep 1, 2026', { exact: true }).waitFor();
			await page.locator('.ui-student-identity').getByRole('button', { name: 'More actions' }).click();
			await page.getByRole('button', { name: 'Change class', exact: true }).click();
			await form.locator('[aria-haspopup=listbox]').click();
			await page.getByRole('option', { name: /Other class/ }).click();
			const sourceEnrollmentId = enrollment.id;
			const transfer = page.waitForRequest(request => request.url().endsWith('/transfer-student'));
			await form.getByTestId('form-modal-submit').click();
			const transferInput = (await transfer).postDataJSON();
			assert.equal(transferInput.enrollmentId, sourceEnrollmentId);
			assert.equal(transferInput.nextClassGroupId, 'other-class');
			await form.waitFor({ state: 'hidden' });
			await placementDate.getByText('Enrolled Sep 1, 2026', { exact: true }).waitFor();
			enrollment.classGroupId = 'class';
			fixture.previousPlacements = false;
		}
		// A valid note deep link must wait for its independent section query.
		fixture.delayNotes = true;
		await page.goto(`${new URL(server.url).origin}/school/students/child/profile?modal=edit-note&modalTarget=note`);
		const noteDeadline = Date.now() + 15000;
		while (!fixture.releaseNotes && Date.now() < noteDeadline) await page.waitForTimeout(20);
		assert(fixture.releaseNotes, 'Delayed note request must start');
		await profile.locator('[data-profile-section=health]').getByRole('button', { name: /edit health/i }).waitFor();
		assert.equal(new URL(page.url()).searchParams.get('modal'), 'edit-note');
		fixture.delayNotes = false;
		fixture.releaseNotes();
		await page.getByTestId('form-modal').locator('textarea').waitFor();
		assert.equal(await page.getByTestId('form-modal').locator('textarea').inputValue(), 'Steady progress in class.');
		await page.keyboard.press('Escape');
		await page.getByTestId('form-modal').waitFor({ state: 'hidden' });
		await page.goto(`${new URL(server.url).origin}/school/students/child/profile?modal=edit-note&modalTarget=missing-note`);
		await page.waitForURL(url => !url.searchParams.has('modal'));

		// A health read failure must not blank pedagogical notes or guardians.
		fixture.failHealth = 503;
		await page.reload();
		const healthSection = profile.locator('[data-profile-section=health]');
		await healthSection.getByRole('button', { name: 'Try again' }).waitFor();
		fixture.failHealth = 0;
		await healthSection.getByRole('button', { name: 'Try again' }).click();
		await healthSection.getByText(medical, { exact: true }).waitFor();
		fixture.failHealth = 403; await page.reload(); await profile.getByText('Steady progress in class.', { exact: true }).waitFor();
		await profile.locator('[data-profile-section=health]').getByText('Access denied', { exact: false }).waitFor();
		fixture.failHealth = 0; fixture.healthRead = false; const before = requests.filter(row => row.path.endsWith('/student-health-profiles/list')).length;
		await page.reload(); await profile.getByText('Steady progress in class.', { exact: true }).waitFor();
		assert.equal(await profile.locator('[data-profile-section=health]').count(), 0);
		assert.equal(requests.filter(row => row.path.endsWith('/student-health-profiles/list')).length, before, 'No medical request without the health-read grant');
		fixture.healthRead = true; fixture.failGuardians = true; await page.reload(); await profile.locator('[data-profile-section=guardians]').getByRole('button', { name: 'Try again', exact: true }).waitFor();
		fixture.failGuardians = false;
		const retriedGuardians = page.waitForResponse(response => response.url().endsWith('/guardians/list') && response.ok());
		await profile.locator('[data-profile-section=guardians]').getByRole('button', { name: 'Try again', exact: true }).click();
		await retriedGuardians;
		await profile.getByRole('button', { name: 'Mariam Koné', exact: true }).waitFor();
		fixture.failHistory = true;
		await page.goto(`${new URL(server.url).origin}/school/students/child/profile?modal=placement-history`);
		await historyPopup.getByRole('button', { name: 'Try again', exact: true }).waitFor();
		fixture.failHistory = false;
		await historyPopup.getByRole('button', { name: 'Try again', exact: true }).click();
		await historyPopup.locator('[data-placement-id]').first().waitFor();
		await historyPopup.getByRole('button', { name: 'Close', exact: true }).click();
		await historyPopup.waitFor({ state: 'hidden' });
		await page.waitForURL(url => !url.searchParams.has('modal'));
		await tabs.getByRole('link', { name: 'Enrollment', exact: true }).click();
		await enrollmentTab.getByText('No optional subjects are offered for this class.', { exact: true }).waitFor();
		fixture.enrollmentRead = false;
		const subjectRequests = requests.filter(row => row.path.includes('get-student-subject-enrollments')).length;
		await page.reload();
		await enrollmentTab.waitFor();
		await page.goto(`${new URL(server.url).origin}/school/students/child/enrollments?modal=placement-history`);
		await historyPopup.getByText('Access denied', { exact: true }).waitFor();
		assert.equal(await historyPopup.locator('[data-placement-id]').count(), 0);
		await historyPopup.getByRole('button', { name: 'Close', exact: true }).click();
		assert.equal(await enrollmentTab.locator('#optional-subjects,#class-history').count(), 0);
		assert.equal(requests.filter(row => row.path.includes('get-student-subject-enrollments')).length, subjectRequests);
		fixture.enrollmentRead = true;
		await page.goto(`${new URL(server.url).origin}/school/students/child/profile`);
		await profile.waitFor();
		// Status changes remain explicit; a failed save preserves the draft for retry.
		await page.getByTestId('student-drawer-body').evaluate(element => element.scrollTop = 0);
		await page.locator('.ui-student-drawer-context').getByRole('button', { name: 'More actions', exact: true }).click();
		await page.getByRole('button', { name: 'Change status', exact: true }).click();
		const statusDialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Change status', exact: true }) });
		await chooseOption(statusDialog.locator('#student-status'), 'inactive');
		assert.equal(student.status, 'active'); fixture.failStatus = true;
		await statusDialog.getByTestId('form-modal-submit').click(); await statusDialog.getByTestId('form-modal-submit').waitFor({ state: 'visible' });
		assert.equal(student.status, 'active'); fixture.failStatus = false;
		await statusDialog.getByTestId('form-modal-submit').click(); await statusDialog.waitFor({ state: 'hidden' });
		assert.equal(student.status, 'inactive');
		console.log('Checking portrait approval, rejection and replacement');
		await page.getByTestId('student-drawer-body').evaluate(element => element.scrollTop = 0);
		await profile.getByRole('button', { name: 'Approve', exact: true }).click();
		await page.getByTestId('confirm-submit').click();
		await page.getByTestId('confirm-modal').waitFor({ state: 'hidden' });
		assert.equal(fixture.pending, false);
		await profile.locator('[data-profile-section=portrait]').waitFor({ state: 'detached' });
		fixture.pending = true; await page.reload(); await profile.getByRole('button', { name: 'Reject', exact: true }).click();
		const reject = page.getByTestId('student-photo-reject-modal');
		await reject.getByRole('textbox').fill('Please upload a clearer portrait.');
		await reject.getByRole('button', { name: 'Reject', exact: true }).click();
		await reject.waitFor({ state: 'hidden' });
		assert.equal(requests.findLast(row => row.path.includes('review-student-photo'))?.body.rejectionReason, 'Please upload a clearer portrait.');
		const chooser = page.waitForEvent('filechooser');
		await page.locator('.ui-student-identity button[aria-label]').first().press('Enter');
		await (await chooser).setFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: png });
		const crop = page.getByTestId('profile-photo-crop-dialog');
		fixture.failPublish = true;
		const failedPublication = page.waitForResponse(response => response.url().includes('publish-student-photo') && response.status() === 503);
		await crop.getByRole('button', { name: 'Use this photo', exact: true }).click();
		await failedPublication;
		assert(await crop.isVisible(), 'A failed publication preserves the crop for retry');
		fixture.failPublish = false;
		await crop.getByRole('button', { name: 'Use this photo', exact: true }).click();
		await crop.waitFor({ state: 'hidden' });
		assert(requests.some(row => row.path.includes('publish-student-photo')), 'Replacement uses existing crop/upload/publication workflow');
		assert.equal(await profile.locator('[data-profile-section=portrait] img').count(), 0, 'Published portrait is never duplicated in body');
		// Delay a medical response across navigation: the previous student cannot seed the next one.
		fixture.delayHealth = true;
		await page.goto(`${new URL(server.url).origin}/school/students/child/profile`);
		await page.waitForFunction(() => !!document.querySelector('[data-testid=student-profile]'));
		for (let attempt = 0; !fixture.releaseHealth && attempt < 100; attempt++) await page.waitForTimeout(10);
		assert(fixture.releaseHealth, 'Delayed medical request was issued');
		fixture.delayHealth = false;
		await page.goto(`${new URL(server.url).origin}/school/students/child2/profile`);
		fixture.releaseHealth(); fixture.releaseHealth = undefined;
		await profile.locator('[data-profile-section=health]').getByText('A+', { exact: true }).waitFor();
		assert((await page.locator('.ui-student-identity').innerText()).includes('Other Student'));
		// An earlier student's delayed placement response must not seed the next drawer.
		fixture.holdPlacementRead = true;
		await page.goto(`${new URL(server.url).origin}/school/students/child/profile?modal=placement-history`, { waitUntil: 'domcontentloaded' });
		const historyDeadline = Date.now() + 15000;
		while (!fixture.releasePlacementRead && Date.now() < historyDeadline) await page.waitForTimeout(20);
		assert(fixture.releasePlacementRead);
		fixture.holdPlacementRead = false;
		await page.goto(`${new URL(server.url).origin}/school/students/child2/profile?modal=placement-history`);
		fixture.releasePlacementRead();
		fixture.releasePlacementRead = undefined;
		await historyPopup.locator('[data-placement-id="placement2"]').waitFor();
		assert.equal(await historyPopup.locator('[data-placement-id]').count(), 1);
		await historyPopup.getByRole('heading', { name: 'Placement history · Other Student' }).waitFor();
		await historyPopup.getByRole('button', { name: 'Close', exact: true }).click();
		guardian.email = 'mariam.kone.long.contact.address@ecole-abidjan.example.test';
		console.log('Checking responsive Profile with full medical text and compact guardian rows');
		for (const language of ['en', 'fr']) {
			await page.goto(`${new URL(server.url).origin}/school/students`);
			await page.getByTestId('language-selector').click();
			await page.getByTestId(`language-option-${language}`).click();
			for (const prefix of ['/school/students/child', '/classes/class/students/child']) {
				fixture.hasPlacement = false;
				await page.goto(`${new URL(server.url).origin}${prefix}/enrollments`);
				await placementDate.getByText(language === 'fr' ? 'Aucune affectation en classe active' : 'No active class placement', { exact: true }).waitFor();
				await page.locator('.ui-student-identity button[aria-haspopup]').click();
				await page.getByRole('button', { name: language === 'fr' ? 'Affecter à une classe' : 'Assign class', exact: true }).waitFor();
				assert.equal(await page.getByRole('button', { name: language === 'fr' ? 'Historique des affectations' : 'Placement history', exact: true }).count(), 0);
				await page.keyboard.press('Escape');
				await page.goto(`${new URL(server.url).origin}${prefix}/enrollments?modal=placement-history`);
				await historyPopup.getByText(language === 'fr' ? 'Aucune inscription enregistrée.' : 'No enrollments recorded.', { exact: true }).waitFor();
				await historyPopup.getByRole('button', { name: language === 'fr' ? 'Fermer' : 'Close', exact: true }).click();
				fixture.previousPlacements = true;
				await page.setViewportSize({ width: 390, height: 844 });
				await page.goto(`${new URL(server.url).origin}${prefix}/profile?modal=placement-history&q=preserved`);
				await historyPopup.locator('[data-placement-id="older"]').waitFor();
				await page.evaluate(() => document.documentElement.style.fontSize = '32px');
				assert(await historyPopup.evaluate(element => element.scrollWidth <= element.clientWidth));
				await historyPopup.getByRole('heading', { name: language === 'fr' ? 'Historique des affectations · Aminata Koné' : 'Placement history · Aminata Koné' }).waitFor();
				await historyPopup.getByRole('button', { name: language === 'fr' ? 'Fermer' : 'Close', exact: true }).click();
				await historyPopup.waitFor({ state: 'hidden' });
				assert.equal(new URL(page.url()).pathname, `${prefix}/profile`);
				assert.equal(new URL(page.url()).searchParams.get('q'), 'preserved');
				fixture.previousPlacements = false;
				await page.setViewportSize({ width: 1440, height: 1000 });
				await page.evaluate(() => document.documentElement.style.fontSize = '16px');

				fixture.hasPlacement = true;
				await page.goto(`${new URL(server.url).origin}${prefix}/documents`);
				const row = page.locator('[data-document-type="student-id-card.v1"]');
				await row.getByText(language === 'fr' ? 'Non émis' : 'Not issued', { exact: true }).waitFor();
				await row.getByText(language === 'fr' ? 'Carte scolaire' : 'Student card', { exact: true }).waitFor();
				const headingSize = await page.locator('.ui-student-section-title').evaluate(el => getComputedStyle(el).fontSize);
				await page.goto(`${new URL(server.url).origin}${prefix}/profile`);
				assert.equal(await profile.locator('#student-personal-heading').evaluate(el => getComputedStyle(el).fontSize), headingSize);
			}
			for (const width of [360, 768, 1440]) {
				for (const scale of [1, 2]) {
					await page.setViewportSize({ width, height: 900 });
					await page.goto(`${new URL(server.url).origin}/school/students`);
					await page.getByTestId('language-selector').click(); await page.getByTestId(`language-option-${language}`).click();
					await page.goto(`${new URL(server.url).origin}${scale === 1 ? '/school' : '/classes/class'}/students/child/profile`);
					await profile.waitFor();
					await page.evaluate(scale => document.documentElement.style.fontSize = `${16 * scale}px`, scale);
					await profile.locator('[data-profile-section=notes]').getByText('Steady progress in class.', { exact: true }).waitFor();
					await page.evaluate(() => document.fonts.ready);
					const body = page.getByTestId('student-drawer-body');
					assert(await body.evaluate(element => element.scrollWidth <= element.clientWidth), `${language}/${width}/${scale}: no horizontal profile overflow`);
					const matricules = page.locator('.ui-student-identity .grid > span');
					const tops = await matricules.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
					assert.equal(tops.length, 2);
					assert.equal(tops[0], tops[1]);
					const healthGrid = profile.locator('[data-profile-section=health] .ui-student-facts');
					assert(await healthGrid.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length === (element.clientWidth >= 480 ? 2 : 1)));
					assert(await healthGrid.evaluate(element => {
						const label = element.querySelector('label')!;
						const value = label.nextElementSibling!;
						return parseFloat(getComputedStyle(label).fontSize) < parseFloat(getComputedStyle(value).fontSize) && getComputedStyle(label).color !== getComputedStyle(value).color;
					}));
					await body.evaluate(element => element.scrollTop = 0);
					await page.screenshot({ path: resolve(output, `${language}-${width}-${scale}.png`) });
					await profile.locator('[data-profile-section=health]').getByRole('button').click();
					const editGrid = page.getByTestId('form-modal').locator('.ui-student-health-fields');
					assert(await editGrid.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length === (element.clientWidth >= 480 ? 2 : 1)));
					await page.getByTestId('form-modal-cancel').click();
					await page.getByTestId('form-modal').waitFor({ state: 'hidden' });
					await guardianCard.scrollIntoViewIfNeeded();
					assert(await guardianCard.evaluate(element => element.scrollWidth <= element.clientWidth), `${language}/${width}/${scale}: guardian card reflows without horizontal overflow`);
					await guardianCard.getByText(guardian.email, { exact: true }).waitFor();
					await guardianCard.getByTestId('guardian-relationship-badge').getByText(language === 'en' ? 'Mother' : 'Mère', { exact: true }).waitFor();
					const detailPositions = await guardianCard.getByTestId('guardian-contact-details').locator(':scope > div').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
					assert.equal(detailPositions.length, 3);
					assert(Math.max(...detailPositions) - Math.min(...detailPositions) < 1, 'All three contact facts occupy the second row');
					assert.equal(await guardians.getByText(/\d+ (results|résultats)/).count(), 0);
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
		console.log('PASS: school/class profile and enrollment, legacy URLs, independent permissions/errors/retry, explicit status changes, guardian Back/focus and FR/EN 200% text');
	}
	catch (error) {
		await page.screenshot({ path: resolve(output, 'failure.png') });
		writeFileSync(resolve(output, 'failure.txt'), `${String(error)}\n${errors.join('\n')}\n${await page.locator('body').innerText()}\n${JSON.stringify(requests.slice(-25), null, 2)}`);
		throw error;
	}
	finally { await browser.close(); await server.close(); }
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });

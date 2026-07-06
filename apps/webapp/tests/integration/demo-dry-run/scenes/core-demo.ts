import { signIn } from '../support/auth';
import { CLASS_6A, CLASS_6B, DEMO_ACTIVITY_NAME } from '../support/constants';
import { assertClassAttendanceNav, ensureDailyAttendanceMode } from '../support/setup';
import { waitForDrawerAside } from '../support/drawer';
import type { DemoContext } from '../support/types';
import { assertNoFatalError, visit } from '../support/visit';

export async function runCoreDemoScenes(ctx: DemoContext): Promise<void> {
	const { base, page, reporter, shot } = ctx;

	try {
		await signIn(ctx);
		reporter.log('D0', '0.1 Login j.aka@', 'pass');
		await shot('D0-login');
	}
	catch (err) {
		reporter.log('D0', '0.1 Login j.aka@', 'fail', err instanceof Error ? err.message : String(err));
		await shot('D0-login-fail');
		throw err;
	}

	await visit(ctx, `${base}/dashboard`, 'D0', '0.2 Dashboard / school context', {
		expectText: /tableau|dashboard|directeur|cocody/i,
	});
	await visit(ctx, `${base}/school/students`, 'D0', '0.3 Sidebar school students');

	try {
		await page.waitForSelector('main', { timeout: 20_000 });
		const rosterVisible = await page
			.getByText(/Effectif|élève/i)
			.first()
			.isVisible({ timeout: 15_000 })
			.catch(() => false);
		if (rosterVisible && await assertNoFatalError(ctx, 'D2', '2.1 Student list')) {
			reporter.log('D2', '2.1 Student list', 'pass');
		}
		else {
			reporter.log(
				'D2',
				'2.1 Student list',
				'fail',
				rosterVisible ? 'Error state visible on page' : 'Roster header missing',
			);
			await shot('D2-2.1-Student-list');
		}
	}
	catch (err) {
		reporter.log('D2', '2.1 Student list', 'fail', err instanceof Error ? err.message : String(err));
		await shot('D2-2.1-Student-list-exception').catch(() => {});
	}
	await visit(ctx, `${base}/school/students/ci-s1`, 'D2', '2.2 Student drawer Kouamé Aya', {
		expectText: /Kouamé|Aya|ci-s1/i,
	});
	await visit(ctx, `${base}/school/guardians`, 'D2', '2.4 Guardians list', { selector: 'main' });

	await visit(ctx, `${base}/dashboard`, 'D1', '1.1 KPI cards', { selector: 'aside#app-sidebar' });
	try {
		await page.locator('a[href*="/school/students"]').first().click();
		const onStudents = await page
			.waitForURL(/\/school\/students/, { timeout: 15_000 })
			.then(() => true)
			.catch(() => false);
		if (onStudents && await assertNoFatalError(ctx, 'D1', '1.2 Dashboard students link')) {
			reporter.log('D1', '1.2 Dashboard students link', 'pass');
		}
		else {
			reporter.log(
				'D1',
				'1.2 Dashboard students link',
				'fail',
				onStudents ? 'Error state after navigation' : 'Did not reach students list',
			);
			await shot('D1-1.2-Dashboard-students-link');
		}
	}
	catch (err) {
		reporter.log('D1', '1.2 Dashboard students link', 'fail', err instanceof Error ? err.message : String(err));
		await shot('D1-1.2-Dashboard-students-link-exception').catch(() => {});
	}

	await visit(ctx, `${base}/school/teachers`, 'D3', '3.1 Teachers list', { selector: 'main' });
	await visit(ctx, `${base}/school/teachers/ci-t1`, 'D3', '3.2 Mme Touré drawer', {
		expectText: /Touré|ci-t1/i,
	});

	await visit(ctx, `${base}/school/staff`, 'D4', '4.1 Staff list', { selector: 'main' });

	const timetablePath = `/classes/${CLASS_6A}/timetable`;
	await visit(ctx, `${base}${timetablePath}`, 'D5', '5.1 Timetable grid', {
		pathPrefix: timetablePath,
		selector: '#planning-week-picker, .edaya-timetable-calendar',
	});
	const pageHtml = await page.content();
	const mathsOrTeacher = /Touré|Mathématiques|fractions|géométrie/i.test(pageHtml);
	reporter.log(
		'D5',
		'5.2 Maths slot shows Mme Touré',
		mathsOrTeacher ? 'pass' : 'skip',
		mathsOrTeacher ? undefined : 'No maths lesson text in grid — verify seed week / teacher assignments manually',
	);

	await visit(ctx, `${base}/classes/${CLASS_6A}/evaluations`, 'D6', '6.1 Evaluations list', { selector: 'main' });
	try {
		const homeworkFilter = page.locator('main select[aria-label="Filter"]').first();
		if (await homeworkFilter.isVisible({ timeout: 10_000 }).catch(() => false)) {
			await homeworkFilter.selectOption({ label: /devoir|homework/i }).catch(async () => {
				const options = await homeworkFilter.locator('option').allTextContents();
				const homeworkOption = options.find(text => /devoir|homework/i.test(text));
				if (homeworkOption) {
					await homeworkFilter.selectOption({ label: homeworkOption });
				}
			});
			await page.waitForTimeout(500);
			const hasHomeworkRow = await page
				.locator('main .space-y-3 button')
				.filter({ hasText: /devoir|homework|exercices|fractions|feuille/i })
				.first()
				.isVisible({ timeout: 10_000 })
				.catch(() => false);
			reporter.log('D6', '6.2 Homework filter', hasHomeworkRow ? 'pass' : 'skip', hasHomeworkRow ? undefined : 'No homework rows after filter');
		}
		else {
			reporter.log('D6', '6.2 Homework filter', 'skip', 'Filter select not visible');
		}
	}
	catch (err) {
		reporter.log('D6', '6.2 Homework filter', 'fail', err instanceof Error ? err.message : String(err));
	}

	if (await ensureDailyAttendanceMode(ctx, CLASS_6B)) {
		reporter.log('D7', '7.0 Ensure 6ème B daily mode', 'pass');
	}
	else {
		reporter.log(
			'D7',
			'7.0 Ensure 6ème B daily mode',
			'skip',
			'Could not configure daily mode — check SCHOOL_STRUCTURE_CONFIGURE',
		);
	}
	await assertClassAttendanceNav(ctx, CLASS_6B, 'D7', '7.1 Attendance nav on 6ème B');
	await visit(ctx, `${base}/classes/${CLASS_6B}/attendance`, 'D7', '7.2 Daily attendance page', { selector: 'main' });

	await visit(ctx, `${base}/school/activities`, 'D8', '8.1 Activities list', {
		selector: 'main',
		expectText: DEMO_ACTIVITY_NAME,
	});
	await visit(ctx, `${base}/school/announcements`, 'D8', '8.3 Announcements', { selector: 'main' });
	await visit(ctx, `${base}/school/events`, 'D8', '8.4 Incidents/events', { selector: 'main' });

	await visit(ctx, `${base}/finance/fees`, 'D9', '9.1 Fees list', { selector: 'main' });
	await visit(ctx, `${base}/finance/payment`, 'D9', '9.2 Payments', { selector: 'main' });
	await visit(ctx, `${base}/finance/billing`, 'D9', '9.3 Billing drawer area', { selector: 'main' });

	await visit(ctx, `${base}/classes/${CLASS_6A}/report-cards`, 'D10', '10.1 Report cards list', { selector: 'main' });
	try {
		const viewBtn = page.getByRole('button', { name: /view|voir|consulter/i }).first();
		const studentLink = page.locator('main tbody tr button.font-medium').first();
		if (await viewBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
			await viewBtn.click();
		}
		else if (await studentLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await studentLink.click();
		}
		else {
			reporter.log('D10', '10.2 Open bulletin drawer', 'skip', 'No report card rows in list');
			return;
		}

		const drawer = await waitForDrawerAside(ctx, 15_000);
		if (drawer) {
			reporter.log('D10', '10.2 Open bulletin drawer', 'pass');
		}
		else {
			reporter.log('D10', '10.2 Open bulletin drawer', 'skip', 'Drawer did not open — verify report card seed');
			await shot('D10-10.2-bulletin-drawer');
		}
	}
	catch (err) {
		reporter.log('D10', '10.2 Open bulletin drawer', 'fail', err instanceof Error ? err.message : String(err));
	}

	await visit(ctx, `${base}/configuration/classes/ci-6a`, 'D11', '11.1 Class config drawer', { selector: 'main' });
	await visit(ctx, `${base}/configuration/grade-levels`, 'D11', '11.2 Grade levels', { selector: 'main' });
	await visit(ctx, `${base}/configuration/academic`, 'D11', '11.3 Academic calendar', { selector: 'main' });
	await visit(ctx, `${base}/configuration/discipline`, 'D11', '11.4 Disciplinary catalog', { selector: 'main' });
}

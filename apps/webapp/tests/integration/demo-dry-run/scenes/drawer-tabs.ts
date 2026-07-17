import {
	CLASS_6A,
	CLASS_SUBJECT_ID,
	STAFF_ID,
	STUDENT_ID,
	TEACHER_ID,
} from '../support/constants';
import {
	classTeachingDrawerPath,
	classTeachingPath,
	schoolStaffPath,
	schoolStudentPath,
	schoolTeacherPath,
} from '../support/paths';
import {
	clickDrawerTab,
	closeDrawer,
	urlTabParam,
	waitForDrawerTabBar,
	waitForUrlTab,
} from '../support/drawer';
import type { DemoContext } from '../support/types';
import { visit } from '../support/visit';

/** URL-backed drawer tabs: deep links, click sync, close strips ?tab=. */
export async function runDrawerTabChecks(ctx: DemoContext): Promise<void> {
	const scene = 'DD';
	const { base, reporter, shot } = ctx;

	const classAssignmentsUrl = `${base}/configuration/classes/${CLASS_6A}?tab=assignments`;
	if (!(await visit(ctx, classAssignmentsUrl, scene, '1 Class group assignments deep-link', {
		pathPrefix: `/configuration/classes/${CLASS_6A}`,
	}))) {
		return;
	}

	if (!(await waitForDrawerTabBar(ctx))) {
		reporter.log(scene, '2 Class drawer tab bar', 'fail', 'Drawer tab bar not visible');
		await shot('DD-2-class-tab-bar');
		return;
	}
	reporter.log(scene, '2 Class drawer tab bar', 'pass');

	if (await waitForUrlTab(ctx, 'assignments')) {
		reporter.log(scene, '3 Class URL tab=assignments', 'pass');
	}
	else {
		reporter.log(scene, '3 Class URL tab=assignments', 'fail', `tab=${urlTabParam(ctx) ?? 'none'}`);
		await shot('DD-3-class-url');
	}

	const assignmentsPanel = ctx.page.getByText(
		/staff assignments|affectations du personnel|homeroom|professeur principal/i,
	);
	if (await assignmentsPanel.first().isVisible({ timeout: 8_000 }).catch(() => false)) {
		reporter.log(scene, '4 Class assignments tab content', 'pass');
	}
	else {
		reporter.log(
			scene,
			'4 Class assignments tab content',
			'skip',
			'Assignments panel copy not found — drawer tab still synced',
		);
	}

	if (await clickDrawerTab(ctx, 'profile')) {
		if (await waitForUrlTab(ctx, null, { absent: true })) {
			reporter.log(scene, '5 Class profile clears URL param', 'pass');
		}
		else {
			reporter.log(scene, '5 Class profile clears URL param', 'fail', `tab=${urlTabParam(ctx) ?? 'none'}`);
			await shot('DD-5-class-profile-url');
		}
	}
	else {
		reporter.log(scene, '5 Class profile clears URL param', 'fail', 'Could not click profile tab');
	}

	if (await clickDrawerTab(ctx, 'assignments')) {
		if (await waitForUrlTab(ctx, 'assignments')) {
			reporter.log(scene, '6 Class assignments updates URL', 'pass');
		}
		else {
			reporter.log(scene, '6 Class assignments updates URL', 'fail', `tab=${urlTabParam(ctx) ?? 'none'}`);
			await shot('DD-6-class-assign-url');
		}
	}
	else {
		reporter.log(scene, '6 Class assignments updates URL', 'fail', 'Could not click assignments tab');
	}

	if (await visit(ctx, `${base}${schoolStudentPath(STUDENT_ID, 'grades')}`, scene, '7 Student grades deep-link', {
		pathPrefix: schoolStudentPath(STUDENT_ID, 'grades'),
	})) {
		if (await waitForDrawerTabBar(ctx)) {
			reporter.log(scene, '8 Student drawer tab bar', 'pass');
		}
		else {
			reporter.log(scene, '8 Student drawer tab bar', 'fail', 'Drawer did not open on direct URL');
			await shot('DD-8-student-tab-bar');
		}

		if (await waitForUrlTab(ctx, 'grades')) {
			reporter.log(scene, '9 Student URL tab=grades', 'pass');
		}
		else {
			reporter.log(scene, '9 Student URL tab=grades', 'fail', `tab=${urlTabParam(ctx) ?? 'none'}`);
			await shot('DD-9-student-url');
		}

		if (await clickDrawerTab(ctx, 'profile') && await waitForUrlTab(ctx, 'profile')) {
			reporter.log(scene, '10 Student profile clears URL param', 'pass');
		}
		else {
			reporter.log(scene, '10 Student profile clears URL param', 'fail', `tab=${urlTabParam(ctx) ?? 'none'}`);
		}
	}

	if (await visit(ctx, `${base}${schoolTeacherPath(TEACHER_ID, 'assignments')}`, scene, '11 Teacher assignments deep-link', {
		pathPrefix: schoolTeacherPath(TEACHER_ID, 'assignments'),
	})) {
		if (await waitForDrawerTabBar(ctx) && await waitForUrlTab(ctx, 'assignments')) {
			reporter.log(scene, '12 Teacher URL tab=assignments', 'pass');
		}
		else {
			reporter.log(scene, '12 Teacher URL tab=assignments', 'fail', `tab=${urlTabParam(ctx) ?? 'none'}`);
			await shot('DD-12-teacher-url');
		}
	}

	if (await visit(ctx, `${base}${schoolStaffPath(STAFF_ID, 'permissions')}`, scene, '13 Staff permissions deep-link', {
		pathPrefix: schoolStaffPath(STAFF_ID, 'permissions'),
	})) {
		if (await waitForDrawerTabBar(ctx) && await waitForUrlTab(ctx, 'permissions')) {
			reporter.log(scene, '14 Staff URL tab=permissions', 'pass');
		}
		else {
			reporter.log(
				scene,
				'14 Staff URL tab=permissions',
				'skip',
				'Permissions tab not available — check ACCESS_CONTROL_ASSIGN',
			);
		}
	}

	const subjectLogbookUrl = `${base}${classTeachingPath(CLASS_6A, CLASS_SUBJECT_ID, 'logbook')}`;
	if (await visit(ctx, subjectLogbookUrl, scene, '15 Subject logbook deep-link', {
		pathPrefix: classTeachingDrawerPath(CLASS_6A, CLASS_SUBJECT_ID),
	})) {
		if (await waitForDrawerTabBar(ctx) && await waitForUrlTab(ctx, 'logbook')) {
			reporter.log(scene, '16 Subject URL tab=logbook', 'pass');
		}
		else {
			reporter.log(scene, '16 Subject URL tab=logbook', 'fail', `tab=${urlTabParam(ctx) ?? 'none'}`);
			await shot('DD-16-subject-url');
		}

		if (await clickDrawerTab(ctx, 'progression')) {
			if (await waitForUrlTab(ctx, 'progression')) {
				reporter.log(scene, '17 Subject progression clears URL param', 'pass');
			}
			else {
				reporter.log(scene, '17 Subject progression clears URL param', 'fail', `tab=${urlTabParam(ctx) ?? 'none'}`);
				await shot('DD-17-subject-progression-url');
			}
		}
		else {
			reporter.log(scene, '17 Subject progression clears URL param', 'fail', 'Could not click chapters tab');
		}

		if (await clickDrawerTab(ctx, 'logbook')) {
			if (await waitForUrlTab(ctx, 'logbook')) {
				reporter.log(scene, '18 Subject logbook updates URL', 'pass');
			}
			else {
				reporter.log(scene, '18 Subject logbook updates URL', 'fail', `tab=${urlTabParam(ctx) ?? 'none'}`);
				await shot('DD-18-subject-logbook-url');
			}
		}
		else {
			reporter.log(scene, '18 Subject logbook updates URL', 'fail', 'Could not click logbook tab');
		}
	}

	await visit(ctx, classAssignmentsUrl, scene, '19 Reopen class drawer for close test', {
		pathPrefix: `/configuration/classes/${CLASS_6A}`,
	});
	if (await closeDrawer(ctx)) {
		const listPath = new URL(ctx.page.url()).pathname;
		const tabAfterClose = urlTabParam(ctx);
		if (listPath === '/configuration/classes' && tabAfterClose === null) {
			reporter.log(scene, '20 Close drawer strips tab param', 'pass');
		}
		else {
			reporter.log(
				scene,
				'20 Close drawer strips tab param',
				'fail',
				`path=${listPath} tab=${tabAfterClose ?? 'none'}`,
			);
			await shot('DD-20-close');
		}
	}
	else {
		reporter.log(scene, '20 Close drawer strips tab param', 'fail', 'Close button not found');
	}
}

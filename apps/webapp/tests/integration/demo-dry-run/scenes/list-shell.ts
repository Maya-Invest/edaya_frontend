import type { DemoContext } from '../support/types';
import {
	assertFilterSelectShell,
	assertFilterSelectShellOrSkip,
	assertListShell,
	assertListShellOrSkip,
	assertReportCardWorkspace,
	assertStructureListShell,
} from '../support/assertions';
import { ATTENDANCE_EXPORT_NAME, CLASS_6A, CLASS_6B } from '../support/constants';
import { visit, visitOrSkip } from '../support/visit';

export async function runListShellScenes(ctx: DemoContext): Promise<void> {
	const { base } = ctx;

	await visit(ctx, `${base}/school/students`, 'DC1', 'Students list shell', { pathPrefix: '/school/students' });
	await assertListShell(ctx, 'DC1', 'Students Filter + More menu');

	await visit(ctx, `${base}/finance/payment`, 'DC2', 'Payments list shell', { pathPrefix: '/finance/payment' });
	await assertListShell(ctx, 'DC2', 'Payments Filter + More menu');

	await visit(ctx, `${base}/configuration/structure/classes`, 'DC3', 'Class groups list shell', {
		pathPrefix: '/configuration/structure/classes',
	});
	await assertStructureListShell(ctx, 'DC3', 'Class groups level navigation and search');

	await visit(ctx, `${base}/configuration/academic`, 'DC4', 'Academic admin list shell', {
		pathPrefix: '/configuration/academic',
	});
	await assertListShell(ctx, 'DC4', 'Academic admin Filter + More menu');

	await visit(ctx, `${base}/classes/${CLASS_6B}/attendance`, 'DC5', 'Attendance list shell', {
		pathPrefix: `/classes/${CLASS_6B}/attendance`,
	});
	await assertListShell(ctx, 'DC5', 'Attendance Filter + More menu', { menuAction: ATTENDANCE_EXPORT_NAME });

	await visit(ctx, `${base}/school/announcements`, 'DC6', 'Announcements list shell', {
		pathPrefix: '/school/announcements',
	});
	await assertListShell(ctx, 'DC6', 'Announcements Filter + More menu');

	await visit(ctx, `${base}/classes/${CLASS_6A}/evaluations`, 'DC7', 'Evaluations filter select', {
		pathPrefix: `/classes/${CLASS_6A}/evaluations`,
	});
	await assertFilterSelectShell(ctx, 'DC7', 'Evaluations FilterSelect + More menu');

	await visit(ctx, `${base}/school/activities`, 'DC8', 'Activities filter select', {
		pathPrefix: '/school/activities',
	});
	await assertFilterSelectShell(ctx, 'DC8', 'Activities FilterSelect + More menu');

	await visit(ctx, `${base}/configuration/structure/details`, 'DC9', 'Report card models workspace', {
		pathPrefix: '/configuration/structure/details',
	});
	// This seeded director has level access but no REPORT_CARD_CONFIGURE grant.
	await assertReportCardWorkspace(ctx, 'DC9', 'Level navigation preserves report configuration restrictions', false);

	await visit(ctx, `${base}/configuration/structure/subjects`, 'DC11', 'Subjects list shell', {
		pathPrefix: '/configuration/structure/subjects',
	});
	await assertStructureListShell(ctx, 'DC11', 'Subjects level navigation and search', /add subject|ajouter une matière/i);

	await visitOrSkip(ctx, `${base}/configuration/grade-scales`, 'DC12', 'Grade scales list shell', {
		pathPrefix: '/configuration/grade-scales',
		skipOnFail: 'May require REPORT_CARD_CONFIGURE',
	});
	await assertListShellOrSkip(
		ctx,
		'DC12',
		'Grade scales list more menu',
		{ requireFilter: false, skipReason: 'May require REPORT_CARD_CONFIGURE' },
	);

	await visit(ctx, `${base}/configuration/notifications`, 'DC13', 'Notification templates list shell', {
		pathPrefix: '/configuration/notifications',
	});
	await assertListShell(ctx, 'DC13', 'Notification templates list more menu', { requireFilter: false });

	await visit(ctx, `${base}/account/inbox`, 'DC14', 'Account inbox shell', {
		pathPrefix: '/account/inbox',
	});

	await visitOrSkip(ctx, `${base}/school/calendar`, 'DC10', 'School calendar filter select', {
		pathPrefix: '/school/calendar',
		skipOnFail: 'Calendar query returned 403 — verify seed grants',
	});
	await assertFilterSelectShellOrSkip(
		ctx,
		'DC10',
		'School calendar FilterSelect + More menu',
		'Calendar query returned 403 — verify seed grants',
	);
}

import {
	assertFilterSelectShell,
	assertFilterSelectShellOrSkip,
	assertListShell,
	assertListShellOrSkip,
} from '../support/assertions';
import { CLASS_6A, CLASS_6B } from '../support/constants';
import type { DemoContext } from '../support/types';
import { visit, visitOrSkip } from '../support/visit';

export async function runListShellScenes(ctx: DemoContext): Promise<void> {
	const { base } = ctx;

	await visit(ctx, `${base}/school/students`, 'DC1', 'Students list shell', { pathPrefix: '/school/students' });
	await assertListShell(ctx, 'DC1', 'Students Filter + More menu');

	await visit(ctx, `${base}/finance/payment`, 'DC2', 'Payments list shell', { pathPrefix: '/finance/payment' });
	await assertListShell(ctx, 'DC2', 'Payments Filter + More menu');

	await visit(ctx, `${base}/configuration/classes`, 'DC3', 'Class groups list shell', {
		pathPrefix: '/configuration/classes',
	});
	await assertListShell(ctx, 'DC3', 'Class groups Filter + More menu');

	await visit(ctx, `${base}/configuration/academic`, 'DC4', 'Academic admin list shell', {
		pathPrefix: '/configuration/academic',
	});
	await assertListShell(ctx, 'DC4', 'Academic admin Filter + More menu');

	await visit(ctx, `${base}/classes/${CLASS_6B}/attendance`, 'DC5', 'Attendance list shell', {
		pathPrefix: `/classes/${CLASS_6B}/attendance`,
	});
	await assertListShell(ctx, 'DC5', 'Attendance Filter + More menu');

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

	await visitOrSkip(ctx, `${base}/configuration/report-cards`, 'DC9', 'Report card defs filter select', {
		pathPrefix: '/configuration/report-cards',
		skipOnFail: 'Director role may lack REPORT_CARD_CONFIGURE',
	});
	await assertFilterSelectShellOrSkip(
		ctx,
		'DC9',
		'Report card definitions FilterSelect + More menu',
		'Director role may lack REPORT_CARD_CONFIGURE',
	);

	await visit(ctx, `${base}/configuration/subjects`, 'DC11', 'Subjects list shell', {
		pathPrefix: '/configuration/subjects',
	});
	await assertFilterSelectShell(ctx, 'DC11', 'Subjects FilterSelect + More menu');

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

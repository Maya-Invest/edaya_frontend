import { CLASS_6A, SEEDED_TIMETABLE_WEEK } from './constants';
import type { DemoContext } from './types';
import { visit } from './visit';

/** Opens the class timetable grid on a seeded week and returns the first session id. */
export async function resolveTimetableSessionId(ctx: DemoContext): Promise<string | null> {
	const listPath = `/classes/${CLASS_6A}/timetable`;
	const ok = await visit(
		ctx,
		`${ctx.base}${listPath}?week=${SEEDED_TIMETABLE_WEEK}`,
		'DD',
		'timetable session resolve',
		{
			pathPrefix: listPath,
			selector: '#planning-week-picker, .edaya-timetable-calendar',
		},
	);
	if (!ok) {
		return null;
	}

	await ctx.page.waitForTimeout(800);

	const sessionLink = ctx.page.locator(`a[href*="/classes/${CLASS_6A}/timetable/"]`).first();
	if (await sessionLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
		const href = await sessionLink.getAttribute('href');
		const match = href?.match(new RegExp(`/classes/${CLASS_6A}/timetable/([^/?#]+)`));
		if (match?.[1]) {
			return match[1];
		}
	}

	const mathEvent = ctx.page
		.locator('.edaya-timetable-calendar .wx-box-event')
		.filter({ hasText: /Math|Touré|fractions|géométrie/i })
		.first();
	const anyEvent = ctx.page.locator(
		'.edaya-timetable-calendar .wx-box-event:not(.edaya-timetable-event--school-calendar)',
	).first();
	const calendarEvent = (await mathEvent.isVisible({ timeout: 5_000 }).catch(() => false))
		? mathEvent
		: anyEvent;

	if (await calendarEvent.isVisible({ timeout: 10_000 }).catch(() => false)) {
		await calendarEvent.click({ force: true });
		await ctx.page.waitForTimeout(1000);
		const path = new URL(ctx.page.url()).pathname;
		const match = path.match(new RegExp(`/classes/${CLASS_6A}/timetable/([^/]+)`));
		if (match?.[1]) {
			return match[1];
		}
	}

	return null;
}

import { CLASS_6A, SEEDED_TIMETABLE_WEEK } from './constants';
import { selectAcademicPeriod } from './academic-period';
import type { DemoContext } from './types';
import { visit } from './visit';

function sessionIdFromPath(pathname: string): string | null {
	const match = pathname.match(new RegExp(`/classes/${CLASS_6A}/timetable/([^/]+)`));
	return match?.[1] ?? null;
}

/** Read session id from the current timetable grid (no navigation). */
export async function pickTimetableSessionIdFromPage(ctx: DemoContext): Promise<string | null> {
	const { page } = ctx;
	const fromUrl = sessionIdFromPath(new URL(page.url()).pathname);
	if (fromUrl) {
		return fromUrl;
	}

	const sessionLink = page.locator(`a[href*="/classes/${CLASS_6A}/timetable/"]`).first();
	if (await sessionLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
		const href = await sessionLink.getAttribute('href');
		const match = href?.match(new RegExp(`/classes/${CLASS_6A}/timetable/([^/?#]+)`));
		if (match?.[1]) {
			return match[1];
		}
	}

	const mathEvent = page
		.locator('.edaya-timetable-calendar .wx-box-event')
		.filter({ hasText: /Math|Touré|fractions|géométrie/i })
		.first();
	const anyEvent = page.locator(
		'.edaya-timetable-calendar .wx-box-event:not(.edaya-timetable-event--school-calendar)',
	).first();
	const calendarEvent = (await mathEvent.isVisible({ timeout: 3_000 }).catch(() => false))
		? mathEvent
		: anyEvent;

	if (await calendarEvent.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await calendarEvent.click({ force: true });
		await page.waitForURL(
			new RegExp(`/classes/${CLASS_6A}/timetable/[^/]+`),
			{ timeout: 10_000 },
		).catch(() => {});
		return sessionIdFromPath(new URL(page.url()).pathname);
	}

	return null;
}

/** Opens the class timetable grid on a seeded week and returns the first session id. */
export async function resolveTimetableSessionId(ctx: DemoContext): Promise<string | null> {
	if (ctx.timetableSessionId) {
		return ctx.timetableSessionId;
	}

	const listPath = `/classes/${CLASS_6A}/timetable`;
	const onGrid = new URL(ctx.page.url()).pathname === listPath;
	if (onGrid) {
		const picked = await pickTimetableSessionIdFromPage(ctx);
		if (picked) {
			ctx.timetableSessionId = picked;
			return picked;
		}
	}

	await selectAcademicPeriod(ctx);
	const ok = await visit(
		ctx,
		`${ctx.base}${listPath}?week=${SEEDED_TIMETABLE_WEEK}`,
		'DD',
		'timetable session resolve',
		{
			pathPrefix: listPath,
			selector: '#planning-week-picker, .edaya-timetable-calendar',
			selectorTimeoutMs: 25_000,
			retry: true,
		},
	);
	if (!ok) {
		return null;
	}

	const picked = await pickTimetableSessionIdFromPage(ctx);
	if (picked) {
		ctx.timetableSessionId = picked;
	}
	return picked;
}

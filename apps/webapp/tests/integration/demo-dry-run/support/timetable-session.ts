import { CLASS_6A } from './constants';
import type { DemoContext } from './types';
import { visit } from './visit';

/** Opens the class timetable grid and returns the first session id from a drawer link, if any. */
export async function resolveTimetableSessionId(ctx: DemoContext): Promise<string | null> {
	const listPath = `/classes/${CLASS_6A}/timetable`;
	const ok = await visit(ctx, `${ctx.base}${listPath}`, 'DD', 'timetable session resolve', {
		pathPrefix: listPath,
	});
	if (!ok) {
		return null;
	}

	const sessionLink = ctx.page.locator(`a[href*="/classes/${CLASS_6A}/timetable/"]`).first();
	if (await sessionLink.isVisible({ timeout: 10_000 }).catch(() => false)) {
		const href = await sessionLink.getAttribute('href');
		const match = href?.match(new RegExp(`/classes/${CLASS_6A}/timetable/([^/]+)`));
		if (match?.[1]) {
			return match[1];
		}
	}

	const calendarEvent = ctx.page.locator(
		'.edaya-timetable-calendar a[href*="/timetable/"], .edaya-timetable-calendar button[data-session-id]',
	).first();
	if (await calendarEvent.isVisible({ timeout: 10_000 }).catch(() => false)) {
		const href = await calendarEvent.getAttribute('href');
		if (href) {
			const match = href.match(new RegExp(`/classes/${CLASS_6A}/timetable/([^/]+)`));
			if (match?.[1]) {
				return match[1];
			}
		}
		await calendarEvent.click();
		await ctx.page.waitForTimeout(600);
		const path = new URL(ctx.page.url()).pathname;
		const match = path.match(new RegExp(`/classes/${CLASS_6A}/timetable/([^/]+)`));
		if (match?.[1]) {
			return match[1];
		}
	}

	return null;
}

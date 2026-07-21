import { CLASS_6A } from './constants';
import type { DemoContext } from './types';
import { visit } from './visit';

/** First evaluation id linked from the class evaluations list, if any. */
export async function resolveEvaluationId(ctx: DemoContext): Promise<string | null> {
	const listPath = `/classes/${CLASS_6A}/evaluations`;
	const ok = await visit(ctx, `${ctx.base}${listPath}`, 'DD', 'evaluation id resolve', {
		pathPrefix: listPath,
	});
	if (!ok) {
		return null;
	}

	const href = await ctx.page
		.locator(`a[href*="/classes/${CLASS_6A}/evaluations/"]`)
		.first()
		.getAttribute('href')
		.catch(() => null);
	if (!href) {
		const row = ctx.page.locator('main .space-y-3 button, main tbody tr button').first();
		if (await row.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await row.click();
			await ctx.page.waitForTimeout(500);
			const path = new URL(ctx.page.url()).pathname;
			const match = path.match(new RegExp(`/classes/${CLASS_6A}/evaluations/([^/]+)`));
			return match?.[1] ?? null;
		}
		return null;
	}

	const match = href.match(new RegExp(`/classes/${CLASS_6A}/evaluations/([^/]+)`));
	return match?.[1] ?? null;
}

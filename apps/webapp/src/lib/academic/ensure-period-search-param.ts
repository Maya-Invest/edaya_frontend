import { resolveScopedPeriodId } from '$lib/academic/period-scope';
import { appGoto } from '$lib/navigation/app-navigation';

type AppGotoOptions = Parameters<typeof appGoto>[1];

const gotoOpts = {
	replaceState: true,
	keepFocus: true,
	noScroll: true,
} as const satisfies AppGotoOptions;

/**
 * If `?period=` is missing, replace the URL with the scoped default period.
 * PageQuery cache keys use the raw search param — without this, resolving via
 * academicContext remounts the list when session period changes before the URL updates.
 */
export function redirectToDefaultPeriod(
	url: URL,
	readPeriod: (url: URL) => string,
	writePeriod: (url: URL, period: string) => string,
): void {
	if (readPeriod(url)) {
		return;
	}
	const period = resolveScopedPeriodId('');
	if (!period) {
		return;
	}
	void appGoto(writePeriod(url, period), gotoOpts);
}

import { get, writable } from 'svelte/store';

const makePage = (url: URL) => ({ url, state: {}, params: { classId: 'class-a', id: url.pathname.includes('/assessment-a') ? 'assessment-a' : undefined } });
export const page = writable(makePage(new URL('http://localhost/classes/class-a/evaluations')));
export async function appGoto(href: string | URL) {
	page.set(makePage(new URL(href, get(page).url)));
}
export function appPath(path: string, params: Record<string, string> = {}) {
	return path.replace('/(app)', '').replace(/\[\[?(\w+)\]?\]/g, (_, key) => params[key] ?? '');
}
export const openRouteSurface = appGoto;
export const closeRouteSurface = appGoto;
export const navigateWithinRouteSurface = appGoto;
export const replaceRouteSurface = appGoto;
export const openDetailDrawer = appGoto;
export const closeDetailDrawer = appGoto;
export function followDrawerTabLink(event: Event, href: string) {
	event.preventDefault();
	void appGoto(href);
}
export const currentRouteSurfaceHref = (url: URL) => url.pathname + url.search;
export function afterNavigate() {}

import { page } from '$app/stores';
import { detailHref } from '$lib/detail-hrefs';
import { appGoto } from '$lib/navigation/app-navigation';
import { get } from 'svelte/store';

export interface StudentGuardianOrigin { href: string; scrollTop: number; guardianId: string; parent?: string; depth?: number }
export function navigateToStudentGuardian(guardianId: string) {
	const current = get(page);
	const origin: StudentGuardianOrigin = { href: `${current.url.pathname}${current.url.search}`, guardianId, scrollTop: document.querySelector('[data-testid=student-drawer-body]')?.scrollTop ?? 0, parent: current.state.routeSurfaceParent, depth: current.state.routeSurfaceDepth };
	void appGoto(detailHref.schoolGuardian(guardianId), { replaceState: true, keepFocus: false, noScroll: true, state: { studentGuardianOrigin: origin } });
}
export function returnToStudent(origin: StudentGuardianOrigin) {
	if (!/^\/(?:school\/students\/[^/]+|classes\/[^/]+\/students\/[^/]+)\/profile(?:\?|$)/.test(origin.href))
		return;
	void appGoto(origin.href, { replaceState: true, noScroll: true, state: { routeSurfaceParent: origin.parent, routeSurfaceDepth: origin.depth, studentGuardianReturn: origin } });
}
export function restoreStudentGuardianFocus(origin?: StudentGuardianOrigin) {
	if (!origin)
		return;
	const target = [...document.querySelectorAll<HTMLElement>('[data-guardian-id]')].find(element => element.dataset.guardianId === origin.guardianId);
	if (!target)
		return;
	const body = document.querySelector('[data-testid=student-drawer-body]');
	if (body)
		body.scrollTop = origin.scrollTop;
	target.focus({ preventScroll: true });
}

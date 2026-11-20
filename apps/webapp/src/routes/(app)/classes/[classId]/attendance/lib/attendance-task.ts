import { TASK_QUERY_KEYS, writeModalSurface } from '$lib/modal/modal-url';

/** Compatibility is address normalization only; it never records attendance. */
export function canonicalAttendanceTaskHref(url: URL): string | null {
	const legacyModal = url.searchParams.get('modal') === 'create-roll-call';
	const legacyTask = url.searchParams.get('task') === 'create-roll-call';
	const current = url.searchParams.get('task') === 'attendance-roll-call';
	if (!legacyModal && !legacyTask && !current)
		return null;
	const clean = new URL(legacyModal ? writeModalSurface(url, { modal: null }) : url, url);
	const href = writeModalSurface(clean, { modal: 'attendance-roll-call', tab: 'create' }, TASK_QUERY_KEYS);
	return href === `${url.pathname}${url.search}` ? null : href;
}

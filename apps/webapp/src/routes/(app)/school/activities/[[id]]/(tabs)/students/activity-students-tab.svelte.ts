import type { PageQueryRequest } from '$lib/queries/page-status';
import type { ActivitiesPageState } from '../../../activities-page.svelte';
import { readModal, readModalTarget } from '$lib/modal/modal-url';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { ApiError } from '@maya-invest/edaya-api-client';
import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { activityDetailIdFromUrl } from '../../../lib/activity-selectors';

const ACTIVITY_STUDENTS_TAB_KEY = Symbol('activity-students-tab');
type Queries = ReturnType<ActivitiesPageState['client']>['queries'];
type Members = Awaited<ReturnType<Queries['getStaffActivityMembers']>>;
type Options = Awaited<ReturnType<Queries['getStaffActivityPupilOptions']>>;

export function pickerStudent(student: Options['items'][number]) {
	return { id: student.id, name: `${student.firstName} ${student.lastName}`, initials: `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`, classId: student.classGroupId ?? '', identifier: student.identifier ?? '', email: '' };
}

export function removalFromUrl(url: URL) {
	return readModal(url, ['remove-enrollment']) ? readModalTarget(url) ?? undefined : undefined;
}

export class ActivityStudentsTabState {
	private data = $state.raw<(Members & { scope: string; activityId: string; pages: number; requestedId?: string }) | null>(null);
	private request = 0;
	loading = $state(false);
	failed = $state(false);

	constructor(private readonly getPage: () => ActivitiesPageState) {}

	get slice() {
		const page = this.getPage();
		return this.data?.activityId === page.selectedId && this.data?.scope === page.scope ? this.data : null;
	}

	clear() {
		this.request++;
		this.data = null;
		this.failed = false;
		this.loading = false;
	}

	private async load(activityId: string, selectedId?: string, more = false, signal?: AbortSignal) {
		const page = this.getPage();
		const scope = page.scope;
		const id = ++this.request;
		const current = this.slice;
		const isCurrent = () => !signal?.aborted && this.request === id && page.selectedId === activityId && page.scope === scope;
		this.loading = true;
		this.failed = false;
		try {
			const read = (cursor?: string) => page.client().queries.getStaffActivityMembers({ activityId, selectedId, cursor }, { signal });
			let result = await read(more ? current?.nextCursor ?? undefined : undefined);
			let pages = more && current ? current.pages + 1 : 1;
			const rows = [...(more && current ? current.items : []), ...result.items];
			const targetPages = more ? pages : current?.pages ?? 1;
			while (isCurrent() && pages < targetPages && result.nextCursor) {
				result = await read(result.nextCursor);
				rows.push(...result.items);
				pages++;
			}
			if (!isCurrent())
				return;
			const byId = new SvelteMap(rows.map(row => [row.id, row]));
			this.data = { ...result, items: [...byId.values()], scope, activityId, pages, requestedId: selectedId };
			if (result.selected)
				byId.set(result.selected.id, result.selected);
			page.patchActivity(activityId, { enrollmentCount: result.total, enrollments: [...byId.values()].map(({ id, status, studentId }) => ({ id, status, studentId })) });
		}
		catch (error) {
			if (isCurrent()) {
				if (!more || (error instanceof ApiError && [400, 401, 403].includes(error.status))) {
					this.data = null;
					page.patchActivity(activityId, { enrollments: undefined });
				}
				this.failed = true;
			}
			throw error;
		}
		finally {
			if (id === this.request)
				this.loading = false;
		}
	}

	async more() {
		const current = this.slice;
		if (current?.nextCursor && !this.loading)
			await this.load(current.activityId, current.requestedId, true).catch(() => {});
	}

	async refresh(activityId: string) {
		if (this.getPage().selectedId === activityId)
			await this.load(activityId, this.slice?.requestedId).catch(() => {});
	}

	query() {
		return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				const activityId = activityDetailIdFromUrl(url);
				if (activityId)
					await this.load(activityId, removalFromUrl(url), false, signal);
				return {};
			},
			hasItems: listPageHasItems,
			errorMessage: 'Unable to load activity students.',
		}, request);
	}
}

export function setActivityStudentsTabState(state: ActivityStudentsTabState) {
	setContext(ACTIVITY_STUDENTS_TAB_KEY, state);
}

export function getActivityStudentsTabState() {
	return getContext<ActivityStudentsTabState>(ACTIVITY_STUDENTS_TAB_KEY);
}

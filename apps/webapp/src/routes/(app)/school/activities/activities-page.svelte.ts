import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { ActivityListFilters } from '$lib/list/list-url-filters';
import type { ActivityEnrollment, ClassActivityEnrollment } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { entityVersions } from '$lib/entity-versions.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readActivityListFilters, writeActivityListFilters } from '$lib/list/list-url-filters';
import { ScopedCursorList } from '$lib/list/scoped-cursor-list.svelte';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { queryClient } from '$lib/queries/client';
import { getContext, setContext } from 'svelte';
import {
	createActivityOnPage,
	deleteActivityOnPage,
	enrollStudentInActivityOnPage,
	ensureActivityDrawerSelection,
	ensureClassActivityEnrollmentOnPage,
	querySchoolActivitiesPage,
	removeActivityEnrollmentOnPage,
	removeClassActivityEnrollmentOnPage,
	updateActivityOnPage,
} from './lib';
import { saveActivityMembershipSelection } from './lib/activity-route-mutation';
import { activityDetailIdFromUrl } from './lib/activity-selectors';

type ProfileResult = Awaited<ReturnType<ReturnType<typeof queryClient>['queries']['getStaffActivityProfile']>>;
export type ActivityView = NonNullable<ProfileResult['activity']> & {
	enrollments?: ActivityEnrollment[];
	classEnrollments?: ClassActivityEnrollment[];
};

const listHandoffLifetime = 60_000;
const ACTIVITIES_VERSION_FAMILIES = ['activities'] as const satisfies readonly EntityVersionKey[];

const ACTIVITIES_PAGE_STATE_KEY = Symbol('activities-page-state');

export class ActivitiesPageState {
	private detail = $state<{ scope: string; activity: ActivityView }>();
	private handoff?: { id: string; key: string };
	private listLoadedAt = 0;
	private mutationRead?: { version: number; pending: Promise<void> };
	detailRevision = $state(0);
	readonly list = new ScopedCursorList(
		() => ({ scope: this.scope, filters: readActivityListFilters(this.getUrl()) }),
		() => {
			this.handoff = undefined;
			this.clearDetail();
			this.detailRevision++;
		},
		({ filters }, cursor, signal) => queryClient().queries.getStaffActivityList({ ...filters, cursor }, { signal }),
		async ({ filters }) => (await queryClient().queries.getStaffActivityListExport(filters)).items,
	);

	private readonly versions = new RouteVersionSnapshot(ACTIVITIES_VERSION_FAMILIES);

	readonly filters: ListFiltersState<ActivityListFilters>;

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeActivityListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readActivityListFilters(getUrl()),
		);
	}

	get selectedId() {
		return activityDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		const id = this.selectedId;
		if (!id) {
			return undefined;
		}
		return this.findActivity(id);
	}

	client() {
		return getBrowserSchoolClient();
	}

	readonly scope = $derived(JSON.stringify([authSession.authUserId, authSession.userId, authSession.schoolId, academicContext.yearId, academicContext.scopeGeneration, authSession.grants]));

	findActivity(id: string): ActivityView | undefined {
		const detail = this.detail;
		return detail?.activity.id === id && detail.scope === this.scope ? detail.activity : undefined;
	}

	clearDetail() {
		this.detail = undefined;
	}

	appendActivity(activity: ActivityView) {
		this.detail = { scope: this.scope, activity };
	}

	removeActivity(id: string) {
		if (this.detail?.activity.id === id)
			this.clearDetail();
	}

	patchActivity(id: string, patch: Partial<ActivityView>) {
		const current = this.findActivity(id);
		if (current)
			this.appendActivity({ ...current, ...patch });
	}

	async refreshList(signal?: AbortSignal) {
		const snapshot = this.versions.capture();
		if (await this.list.refresh(signal)) {
			this.versions.markLoaded(snapshot);
			this.listLoadedAt = Date.now();
		}
	}

	selectFromList(id: string) {
		this.handoff = { id, key: this.list.key };
	}

	takeListSelection(id: string) {
		const intent = this.handoff;
		this.handoff = undefined;
		if (intent?.id !== id || intent.key !== this.list.key || this.list.denied || this.list.failed
			|| this.versions.isStale() || Date.now() - this.listLoadedAt >= listHandoffLifetime) {
			return undefined;
		}
		return this.list.current?.items.find(row => row.id === id);
	}

	async refreshAfterMutation() {
		const read = { version: entityVersions.activities, pending: this.refreshList() };
		this.mutationRead = read;
		try {
			await read.pending;
		}
		finally {
			if (this.mutationRead === read)
				this.mutationRead = undefined;
		}
	}

	async invalidateIfStale() {
		if (this.mutationRead?.version === entityVersions.activities)
			return this.mutationRead.pending;
		if (!this.versions.hasLoaded() || !this.versions.isStale()) {
			return;
		}
		this.detailRevision++;
		await this.refreshList();
	}

	queryListPage() {
		return querySchoolActivitiesPage(this);
	}

	ensureDrawerSelection(activityId: string, signal: AbortSignal) {
		return ensureActivityDrawerSelection(this, activityId, signal);
	}

	createActivity(...args: Parameters<typeof createActivityOnPage> extends [ActivitiesPageState, ...infer R] ? R : never) {
		return createActivityOnPage(this, ...args);
	}

	updateActivity(...args: Parameters<typeof updateActivityOnPage> extends [ActivitiesPageState, ...infer R] ? R : never) {
		return updateActivityOnPage(this, ...args);
	}

	deleteActivity(...args: Parameters<typeof deleteActivityOnPage> extends [ActivitiesPageState, ...infer R] ? R : never) {
		return deleteActivityOnPage(this, ...args);
	}

	enrollStudent(...args: Parameters<typeof enrollStudentInActivityOnPage> extends [ActivitiesPageState, ...infer R] ? R : never) {
		return enrollStudentInActivityOnPage(this, ...args);
	}

	addStudents(activityId: string, ids: string[], isCurrent: () => boolean) {
		return saveActivityMembershipSelection(this, ids, (studentId, recordSave) =>
			enrollStudentInActivityOnPage(this, { activityId, studentId, status: 'pending' }, recordSave), isCurrent);
	}

	addClasses(activityId: string, ids: string[], isCurrent: () => boolean) {
		return saveActivityMembershipSelection(this, ids, (classGroupId, recordSave) =>
			ensureClassActivityEnrollmentOnPage(this, { activityId, classGroupId }, recordSave), isCurrent);
	}

	removeEnrollment(...args: Parameters<typeof removeActivityEnrollmentOnPage> extends [ActivitiesPageState, ...infer R] ? R : never) {
		return removeActivityEnrollmentOnPage(this, ...args);
	}

	ensureClassEnrollment(...args: Parameters<typeof ensureClassActivityEnrollmentOnPage> extends [ActivitiesPageState, ...infer R] ? R : never) {
		return ensureClassActivityEnrollmentOnPage(this, ...args);
	}

	removeClassEnrollment(...args: Parameters<typeof removeClassActivityEnrollmentOnPage> extends [ActivitiesPageState, ...infer R] ? R : never) {
		return removeClassActivityEnrollmentOnPage(this, ...args);
	}
}

export function setActivitiesPageState(state: ActivitiesPageState) {
	setContext(ACTIVITIES_PAGE_STATE_KEY, state);
}

export function getActivitiesPageState(): ActivitiesPageState {
	const state = getContext<ActivitiesPageState>(ACTIVITIES_PAGE_STATE_KEY);
	if (!state) {
		throw new Error('ActivitiesPageState is not available in this component tree');
	}
	return state;
}

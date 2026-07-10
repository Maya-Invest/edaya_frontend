import type { ActivityListFilters } from '$lib/list/list-url-filters';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { Activity, Student } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { fetchActivities } from '$lib/api/activities-data';
import { fetchPeopleSources, mapStudents } from '$lib/api/people-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { mergeById } from '$lib/detail-data/seed-policies';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readActivityListFilters, writeActivityListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
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
import { filterActivityList } from './lib/activity-list-filters';
import { activityDetailIdFromUrl } from './lib/activity-selectors';

const ACTIVITIES_VERSION_FAMILIES = ['activities'] as const satisfies readonly EntityVersionKey[];

const ACTIVITIES_PAGE_STATE_KEY = Symbol('activities-page-state');

export class ActivitiesPageState {
	activities = $state<Activity[]>([]);
	students = $state<Student[]>([]);
	studentsLoading = $state(false);
	studentsLoaded = $state(false);
	selectedResolving = $state(false);
	listLoading = $state(false);

	private studentsLoadVersion = 0;
	private listRequestVersion = 0;
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

	findActivity(id: string): Activity | undefined {
		return this.activities.find(activity => activity.id === id);
	}

	findStudent(id: string): Student | undefined {
		return this.students.find(student => student.id === id);
	}

	filterVisible(activities: readonly Activity[] = this.activities): Activity[] {
		return filterActivityList(activities, this.filters.values);
	}

	get visibleActivities() {
		return this.filterVisible();
	}

	seedPage(activities: Activity[]) {
		this.activities = activities;
		this.versions.markLoaded();
	}

	mergeActivities(incoming: readonly Activity[]) {
		this.activities = mergeById(this.activities, incoming);
	}

	appendActivity(activity: Activity) {
		this.mergeActivities([activity]);
	}

	removeActivity(id: string) {
		this.activities = this.activities.filter(activity => activity.id !== id);
	}

	patchActivity(id: string, patch: Partial<Activity>) {
		const index = this.activities.findIndex(activity => activity.id === id);
		if (index >= 0) {
			this.activities[index] = { ...this.activities[index], ...patch };
		}
	}

	async loadActivities() {
		const version = ++this.listRequestVersion;
		this.listLoading = true;
		try {
			const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
			if (!schoolId) {
				if (version === this.listRequestVersion) {
					this.seedPage([]);
				}
				return;
			}
			const activities = await fetchActivities(this.client(), schoolId);
			if (version === this.listRequestVersion) {
				this.seedPage(activities);
			}
		}
		finally {
			if (version === this.listRequestVersion) {
				this.listLoading = false;
			}
		}
	}

	async ensureStudents(): Promise<void> {
		if (this.studentsLoaded || this.studentsLoading) {
			return;
		}

		const version = ++this.studentsLoadVersion;
		this.studentsLoading = true;
		try {
			const sources = await fetchPeopleSources(this.client());
			if (version !== this.studentsLoadVersion) {
				return;
			}
			this.students = mapStudents(sources);
			this.studentsLoaded = true;
		}
		finally {
			if (version === this.studentsLoadVersion) {
				this.studentsLoading = false;
			}
		}
	}

	async refreshList() {
		await this.loadActivities();
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshList();
	}

	hydrateFiltersFromUrl() {
		this.filters.hydrate(readActivityListFilters(this.getUrl()));
	}

	queryListPage() {
		return querySchoolActivitiesPage(this);
	}

	ensureDrawerSelection(activityId: string) {
		return ensureActivityDrawerSelection(this, activityId);
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

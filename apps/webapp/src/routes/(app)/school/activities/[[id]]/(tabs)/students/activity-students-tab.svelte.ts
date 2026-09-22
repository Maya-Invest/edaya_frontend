import type { PageQueryRequest } from '$lib/queries/page-status';
import type { ActivityEnrollment } from '$lib/types/school';
import type { ActivitiesPageState } from '../../../activities-page.svelte';
import { fetchActivityById } from '$lib/api/activities-data';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { getContext, setContext } from 'svelte';
import { activityDetailIdFromUrl } from '../../../lib/activity-selectors';

const ACTIVITY_STUDENTS_TAB_KEY = Symbol('activity-students-tab');

export interface ActivityStudentsTabSlice {
	activityId: string;
	enrollments: ActivityEnrollment[];
}

export class ActivityStudentsTabState {
	slice = $state<ActivityStudentsTabSlice | null>(null);

	constructor(private readonly getPage: () => ActivitiesPageState) {}

	clear() {
		this.slice = null;
	}

	enrollmentsFor(activityId: string): ActivityEnrollment[] {
		return this.slice?.activityId === activityId ? this.slice.enrollments : [];
	}

	syncFromPage(activityId: string) {
		const activity = this.getPage().findActivity(activityId);
		if (!activity) {
			return;
		}
		this.slice = { activityId, enrollments: activity.enrollments };
	}

	query() {
		return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				const activityId = activityDetailIdFromUrl(url);
				if (!activityId) {
					return {};
				}

				const page = this.getPage();
				const activity = await fetchActivityById(page.client(), activityId);
				if (activity) {
					page.mergeActivities([activity]);
					signal.throwIfAborted();
					this.slice = { activityId, enrollments: activity.enrollments };
				}
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

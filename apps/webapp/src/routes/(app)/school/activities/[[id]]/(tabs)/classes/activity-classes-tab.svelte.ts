import type { ClassActivityEnrollment } from '$lib/types/school';
import type { ActivitiesPageState } from '../../../activities-page.svelte';
import { fetchActivityById } from '$lib/api/activities-data';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { getContext, setContext } from 'svelte';
import { activityDetailIdFromUrl } from '../../../lib/activity-selectors';

const ACTIVITY_CLASSES_TAB_KEY = Symbol('activity-classes-tab');

export interface ActivityClassesTabSlice {
	activityId: string;
	classEnrollments: ClassActivityEnrollment[];
}

export class ActivityClassesTabState {
	slice = $state<ActivityClassesTabSlice | null>(null);

	constructor(private readonly getPage: () => ActivitiesPageState) {}

	clear() {
		this.slice = null;
	}

	classEnrollmentsFor(activityId: string): ClassActivityEnrollment[] {
		return this.slice?.activityId === activityId ? this.slice.classEnrollments : [];
	}

	syncFromPage(activityId: string) {
		const activity = this.getPage().findActivity(activityId);
		if (!activity) {
			return;
		}
		this.slice = { activityId, classEnrollments: activity.classEnrollments };
	}

	query() {
		return (url: URL) => resolvePageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const activityId = activityDetailIdFromUrl(url);
				if (!activityId) {
					return {};
				}

				const page = this.getPage();
				const activity = await fetchActivityById(page.client(), activityId);
				if (activity) {
					page.mergeActivities([activity]);
					this.slice = { activityId, classEnrollments: activity.classEnrollments };
				}
				return {};
			},
			hasItems: listPageHasItems,
			errorMessage: 'Unable to load activity classes.',
		});
	}
}

export function setActivityClassesTabState(state: ActivityClassesTabState) {
	setContext(ACTIVITY_CLASSES_TAB_KEY, state);
}

export function getActivityClassesTabState() {
	return getContext<ActivityClassesTabState>(ACTIVITY_CLASSES_TAB_KEY);
}

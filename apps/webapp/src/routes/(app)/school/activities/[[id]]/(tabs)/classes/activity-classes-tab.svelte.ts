import type { PageQueryRequest } from '$lib/queries/page-status';
import type { ClassActivityEnrollment } from '$lib/types/school';
import type { ActivitiesPageState } from '../../../activities-page.svelte';
import { listAllEntityPages } from '$lib/api/entity-list-filters';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
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
		if (!activity?.classEnrollments) {
			return;
		}
		this.slice = { activityId, classEnrollments: activity.classEnrollments };
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
				const scope = page.scope;
				const rows = await safeOptionalEntityList(() => listAllEntityPages(
					q => page.client().entities.classActivityEnrollments.list(q),
{ baseQuery: { activityId }, signal },
				));
				signal.throwIfAborted();
				if (scope === page.scope && page.selectedId === activityId) {
					page.patchActivity(activityId, { classEnrollments: rows.map(({ id, classGroupId }) => ({ id, classGroupId })) });
					this.syncFromPage(activityId);
				}
				return {};
			},
			hasItems: listPageHasItems,
			errorMessage: 'Unable to load activity classes.',
		}, request);
	}
}

export function setActivityClassesTabState(state: ActivityClassesTabState) {
	setContext(ACTIVITY_CLASSES_TAB_KEY, state);
}

export function getActivityClassesTabState() {
	return getContext<ActivityClassesTabState>(ACTIVITY_CLASSES_TAB_KEY);
}

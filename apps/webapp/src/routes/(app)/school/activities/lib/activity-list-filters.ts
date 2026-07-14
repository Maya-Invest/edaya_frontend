import type { ActivityListFilters } from '$lib/list/list-url-filters';
import type { Activity } from '$lib/types/school';

export type ActivitySortColumn = Exclude<ActivityListFilters['sort'], 'roster'>;

export function cycleActivityListSort(
	filters: Pick<ActivityListFilters, 'sort' | 'sortDir'>,
	column: ActivitySortColumn,
): Pick<ActivityListFilters, 'sort' | 'sortDir'> {
	if (filters.sort !== column) {
		return { sort: column, sortDir: 'asc' };
	}
	if (filters.sortDir === 'asc') {
		return { sort: column, sortDir: 'desc' };
	}
	return { sort: 'roster', sortDir: 'asc' };
}

function compareNames(left: Activity, right: Activity) {
	return left.name.localeCompare(right.name, 'fr');
}

function sortActivityList(
	activities: Activity[],
	sort: ActivityListFilters['sort'],
	sortDir: ActivityListFilters['sortDir'],
): Activity[] {
	const direction = sortDir === 'desc' ? -1 : 1;

	switch (sort) {
		case 'name':
			return [...activities].sort((left, right) => direction * compareNames(left, right));
		case 'category':
			return [...activities].sort(
				(left, right) => direction * left.category.localeCompare(right.category, 'fr')
					|| compareNames(left, right),
			);
		case 'coach':
			return [...activities].sort(
				(left, right) => direction * left.coach.localeCompare(right.coach, 'fr')
					|| compareNames(left, right),
			);
		case 'period':
			return [...activities].sort(
				(left, right) => direction * left.startDate.localeCompare(right.startDate)
					|| left.endDate.localeCompare(right.endDate)
					|| compareNames(left, right),
			);
		case 'enrolled':
			return [...activities].sort(
				(left, right) => direction * (left.enrollments.length - right.enrollments.length)
					|| compareNames(left, right),
			);
		default:
			return activities;
	}
}

export function filterActivityList(
	activities: readonly Activity[],
	filters: ActivityListFilters,
): Activity[] {
	const needle = filters.q.trim().toLowerCase();
	const filtered = activities.filter((activity) => {
		if (filters.category !== 'all' && activity.category !== filters.category) {
			return false;
		}
		if (!needle) {
			return true;
		}
		return activity.name.toLowerCase().includes(needle)
			|| activity.coach.toLowerCase().includes(needle)
			|| activity.description.toLowerCase().includes(needle)
			|| activity.category.toLowerCase().includes(needle);
	});
	return sortActivityList(filtered, filters.sort, filters.sortDir);
}

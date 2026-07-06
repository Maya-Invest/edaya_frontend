import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Activity } from '$lib/types/school';
import { activityEnrollmentsForActivities, uniqueIds } from '$lib/api/entity-list-filters';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type ActivityRaw = components['schemas']['Activity'];
type ActivityEnrollmentRaw = components['schemas']['ActivityEnrollment'];

export interface ActivitySources {
	activitiesRaw: ActivityRaw[];
	activityEnrollmentsRaw: ActivityEnrollmentRaw[];
}

const CATEGORY_TO_UI: Record<string, Activity['category']> = {
	Sport: 'Sport',
	Arts: 'Arts',
	Science: 'Science',
	Language: 'Language',
	Wellbeing: 'Wellbeing',
};

const ENROLLMENT_STATUS_TO_UI: Record<string, Activity['enrollments'][number]['status']> = {
	approved: 'approved',
	pending: 'pending',
	denied: 'denied',
};

function formatDate(value: unknown): string {
	if (!value) {
		return '';
	}
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	if (typeof value === 'string') {
		return value.slice(0, 10);
	}
	return String(value).slice(0, 10);
}

export async function fetchActivitySources(
	client: SchoolClient,
	schoolId: string,
): Promise<ActivitySources> {
	const activitiesRaw = await safeOptionalEntityList(
		() => client.entities.activities.list({ schoolId }),
	);
	const activityIds = uniqueIds(activitiesRaw.map(activity => activity.id));
	const activityEnrollmentsRaw = activityIds.length > 0
		? await safeOptionalEntityList(
				() => client.entities.activityEnrollments.list(activityEnrollmentsForActivities(activityIds)),
			)
		: [];

	return {
		activitiesRaw,
		activityEnrollmentsRaw,
	};
}

export function mapActivities(sources: ActivitySources): Activity[] {
	const enrollmentsByActivity = new Map<string, ActivityEnrollmentRaw[]>();
	for (const enrollment of sources.activityEnrollmentsRaw) {
		const current = enrollmentsByActivity.get(enrollment.activityId) ?? [];
		current.push(enrollment);
		enrollmentsByActivity.set(enrollment.activityId, current);
	}

	return sources.activitiesRaw.map(activity => ({
		id: activity.id,
		name: activity.name,
		category: CATEGORY_TO_UI[activity.category] ?? 'Science',
		coach: activity.coach,
		schedule: activity.schedule,
		participants: activity.participants,
		capacity: activity.capacity,
		description: activity.description,
		startDate: formatDate(activity.startDate),
		endDate: formatDate(activity.endDate),
		enrollments: (enrollmentsByActivity.get(activity.id) ?? []).map(enrollment => ({
			id: enrollment.id,
			studentId: enrollment.studentId,
			status: ENROLLMENT_STATUS_TO_UI[enrollment.status] ?? 'pending',
		})),
	}));
}

export async function fetchActivities(client: SchoolClient, schoolId: string): Promise<Activity[]> {
	const sources = await fetchActivitySources(client, schoolId);
	return mapActivities(sources);
}

export async function fetchActivityById(
	client: SchoolClient,
	activityId: string,
): Promise<Activity | null> {
	const activitiesRaw = await safeOptionalEntityList(async () => {
		const activity = await client.entities.activities.one({ id: activityId });
		return activity ? [activity] : [];
	});
	if (activitiesRaw.length === 0) {
		return null;
	}

	const activityEnrollmentsRaw = await safeOptionalEntityList(
		() => client.entities.activityEnrollments.list({ activityId }),
	);

	return mapActivities({ activitiesRaw, activityEnrollmentsRaw })[0] ?? null;
}

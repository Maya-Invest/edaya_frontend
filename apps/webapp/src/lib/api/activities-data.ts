import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Activity } from '$lib/types/school';
import {
	listAllEntityPages,
	listAllEntityPagesForIdFilters,
	uniqueIds,
} from '$lib/api/entity-list-filters';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

type ActivityRaw = components['schemas']['Activity'];
type ActivityEnrollmentRaw = components['schemas']['ActivityEnrollment'];
type ClassActivityEnrollmentRaw = components['schemas']['ClassActivityEnrollment'];

export interface ActivitySources {
	activitiesRaw: ActivityRaw[];
	activityEnrollmentsRaw: ActivityEnrollmentRaw[];
	classActivityEnrollmentsRaw: ClassActivityEnrollmentRaw[];
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

export type ActivityOption = Pick<Activity, 'id' | 'name'>;

function listSchoolActivities(client: SchoolClient, schoolId: string, signal?: AbortSignal) {
	return safeOptionalEntityList(() => listAllEntityPages(
		query => client.entities.activities.list(query),
		{ baseQuery: { schoolId }, signal },
	));
}

export async function fetchActivityOptions(client: SchoolClient, schoolId: string, signal?: AbortSignal): Promise<ActivityOption[]> {
	const activities = await listSchoolActivities(client, schoolId, signal);
	return activities.map(({ id, name }) => ({ id, name }));
}

export async function fetchActivitySources(
	client: SchoolClient,
	schoolId: string,
): Promise<ActivitySources> {
	const activitiesRaw = await listSchoolActivities(client, schoolId);
	const activityIds = uniqueIds(activitiesRaw.map(activity => activity.id));
	const activityEnrollmentsRaw = await safeOptionalEntityList(
		() => listAllEntityPagesForIdFilters(
			query => client.entities.activityEnrollments.list(query),
			[{ field: 'activityId', ids: activityIds }],
		),
	);
	const classActivityEnrollmentsRaw = await safeOptionalEntityList(
		() => listAllEntityPagesForIdFilters(
			query => client.entities.classActivityEnrollments.list(query),
			[{ field: 'activityId', ids: activityIds }],
		),
	);

	return {
		activitiesRaw,
		activityEnrollmentsRaw,
		classActivityEnrollmentsRaw,
	};
}

export function mapActivities(sources: ActivitySources): Activity[] {
	const enrollmentsByActivity = new Map<string, ActivityEnrollmentRaw[]>();
	for (const enrollment of sources.activityEnrollmentsRaw) {
		const current = enrollmentsByActivity.get(enrollment.activityId) ?? [];
		current.push(enrollment);
		enrollmentsByActivity.set(enrollment.activityId, current);
	}

	const classEnrollmentsByActivity = new Map<string, ClassActivityEnrollmentRaw[]>();
	for (const enrollment of sources.classActivityEnrollmentsRaw) {
		const current = classEnrollmentsByActivity.get(enrollment.activityId) ?? [];
		current.push(enrollment);
		classEnrollmentsByActivity.set(enrollment.activityId, current);
	}

	return sources.activitiesRaw.map(activity => ({
		id: activity.id,
		name: activity.name,
		shortName: activity.shortName,
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
		classEnrollments: (classEnrollmentsByActivity.get(activity.id) ?? []).map(enrollment => ({
			id: enrollment.id,
			classGroupId: enrollment.classGroupId,
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
	signal?: AbortSignal,
): Promise<Activity | null> {
	signal?.throwIfAborted();
	const activitiesRaw = await safeOptionalEntityList(async () => {
		const activity = await client.entities.activities.one({ id: activityId });
		return activity ? [activity] : [];
	});
	if (activitiesRaw.length === 0) {
		return null;
	}

	const options = { baseQuery: { activityId }, signal };
	const [activityEnrollmentsRaw, classActivityEnrollmentsRaw] = await Promise.all([
		safeOptionalEntityList(() => listAllEntityPages(query => client.entities.activityEnrollments.list(query), options)),
		safeOptionalEntityList(() => listAllEntityPages(query => client.entities.classActivityEnrollments.list(query), options)),
	]);
	signal?.throwIfAborted();

	return mapActivities({ activitiesRaw, activityEnrollmentsRaw, classActivityEnrollmentsRaw })[0] ?? null;
}

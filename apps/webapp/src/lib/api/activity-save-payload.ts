import type { components } from '$lib/api/schema';
import type { Activity } from '$lib/types/school';

type ActivityEntity = components['schemas']['Activity'];

export const DEFAULT_ACTIVITY_SCHEDULE = '—';

export function buildActivitySavePayload(
	existing: ActivityEntity,
	updates: {
		name: string;
		category: Activity['category'];
		coach: string;
		capacity: number;
		description: string;
		startDate: string;
		endDate: string;
	},
): ActivityEntity {
	const participants = Math.max(
		typeof existing.participants === 'number' ? existing.participants : 0,
		0,
	);
	const schedule = typeof existing.schedule === 'string' && existing.schedule.trim().length > 0
		? existing.schedule.trim()
		: DEFAULT_ACTIVITY_SCHEDULE;
	const capacity = Math.max(updates.capacity, participants);

	return {
		id: existing.id,
		schoolId: existing.schoolId,
		name: updates.name.trim(),
		category: updates.category,
		coach: updates.coach.trim(),
		schedule,
		participants,
		capacity,
		description: updates.description.trim(),
		startDate: updates.startDate,
		endDate: updates.endDate,
		...(existing.createdAt !== undefined && existing.createdAt !== null
			? { createdAt: existing.createdAt }
			: {}),
	};
}

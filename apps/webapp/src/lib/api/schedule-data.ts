import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { TimetableSchedule, TimetableScheduleDay } from '$lib/types/school';
import { classGroupScope, entitiesByIds } from '$lib/api/entity-list-filters';
import { SCHEDULE_DAY_TO_PLANNING } from '$lib/components/school/scheduling/planning-calendar';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type ScheduleRaw = components['schemas']['Schedule'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectRaw = components['schemas']['Subject'];
type ActivityRaw = components['schemas']['Activity'];

const SCHEDULE_DAY_ORDER: TimetableScheduleDay[] = [
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday',
];

function scheduleDayLabel(dayOfWeek?: TimetableScheduleDay | null): TimetableSchedule['day'] {
	if (!dayOfWeek) {
		return 'Mon';
	}
	return SCHEDULE_DAY_TO_PLANNING[dayOfWeek];
}

export function mapTimetableSchedules(
	classGroupId: string,
	schedulesRaw: ScheduleRaw[],
	classSubjectsRaw: ClassSubjectRaw[],
	subjectsRaw: SubjectRaw[],
	activitiesRaw: ActivityRaw[] = [],
): TimetableSchedule[] {
	const classSubjectById = new Map(classSubjectsRaw.map(entry => [entry.id, entry]));
	const subjectById = new Map(subjectsRaw.map(subject => [subject.id, subject]));
	const activityById = new Map(activitiesRaw.map(activity => [activity.id, activity]));

	return schedulesRaw
		.filter(schedule => schedule.classGroupId === classGroupId)
		.map((schedule) => {
			const scheduleKind = schedule.scheduleKind ?? 'lesson';
			const classSubject = schedule.classSubjectId
				? classSubjectById.get(schedule.classSubjectId)
				: undefined;
			const subject = classSubject ? subjectById.get(classSubject.subjectId) : undefined;
			const activity = schedule.activityId ? activityById.get(schedule.activityId) : undefined;
			const dayOfWeek = schedule.dayOfWeek as TimetableScheduleDay | undefined;
			const label = scheduleKind === 'activity'
				? activity?.name ?? schedule.title
				: subject?.name ?? schedule.title;

			return {
				id: schedule.id,
				classId: schedule.classGroupId,
				scheduleKind,
				classSubjectId: schedule.classSubjectId ?? undefined,
				activityId: schedule.activityId ?? undefined,
				title: schedule.title,
				isRecurring: schedule.isRecurring,
				dayOfWeek,
				day: scheduleDayLabel(dayOfWeek),
				startTime: schedule.startTime,
				endTime: schedule.endTime,
				subject: label,
				specificDate: schedule.specificDate ? String(schedule.specificDate).slice(0, 10) : undefined,
			} satisfies TimetableSchedule;
		})
		.sort((left, right) => {
			const dayOrder = SCHEDULE_DAY_ORDER.indexOf(left.dayOfWeek ?? 'monday')
				- SCHEDULE_DAY_ORDER.indexOf(right.dayOfWeek ?? 'monday');
			if (dayOrder !== 0) {
				return dayOrder;
			}
			return left.startTime.localeCompare(right.startTime);
		});
}

export async function loadClassSchedules(client: SchoolClient, classGroupId: string): Promise<TimetableSchedule[]> {
	const [schedulesRaw, classSubjectsRaw] = await Promise.all([
		client.entities.schedules.list(classGroupScope(classGroupId)),
		client.entities.classSubjects.list(classGroupScope(classGroupId)),
	]);
	const subjectIds = [...new Set((classSubjectsRaw ?? []).map(entry => entry.subjectId))];
	const activityIds = [...new Set(
		(schedulesRaw ?? [])
			.filter(schedule => schedule.scheduleKind === 'activity' && schedule.activityId)
			.map(schedule => schedule.activityId as string),
	)];

	const [subjectsRaw, activitiesRaw] = await Promise.all([
		subjectIds.length > 0
			? client.entities.subjects.list(entitiesByIds(subjectIds))
			: Promise.resolve([]),
		activityIds.length > 0
			? client.entities.activities.list(entitiesByIds(activityIds))
			: Promise.resolve([]),
	]);

	return mapTimetableSchedules(
		classGroupId,
		schedulesRaw ?? [],
		classSubjectsRaw ?? [],
		subjectsRaw ?? [],
		activitiesRaw ?? [],
	);
}

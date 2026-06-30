import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { TimetableSchedule, TimetableScheduleDay } from '$lib/types/school';
import { classGroupScope, entitiesByIds } from '$lib/api/entity-list-filters';
import { SCHEDULE_DAY_TO_PLANNING } from '$lib/components/school/scheduling/planning-calendar';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type ScheduleRaw = components['schemas']['Schedule'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];
type SubjectRaw = components['schemas']['Subject'];

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
): TimetableSchedule[] {
	const classSubjectById = new Map(classSubjectsRaw.map(entry => [entry.id, entry]));
	const subjectById = new Map(subjectsRaw.map(subject => [subject.id, subject]));

	return schedulesRaw
		.filter(schedule => schedule.classGroupId === classGroupId)
		.map((schedule) => {
			const classSubject = schedule.classSubjectId
				? classSubjectById.get(schedule.classSubjectId)
				: undefined;
			const subject = classSubject ? subjectById.get(classSubject.subjectId) : undefined;
			const dayOfWeek = schedule.dayOfWeek as TimetableScheduleDay | undefined;

			return {
				id: schedule.id,
				classId: schedule.classGroupId,
				classSubjectId: schedule.classSubjectId ?? undefined,
				title: schedule.title,
				isRecurring: schedule.isRecurring,
				dayOfWeek,
				day: scheduleDayLabel(dayOfWeek),
				startTime: schedule.startTime,
				endTime: schedule.endTime,
				subject: subject?.name ?? schedule.title,
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
	const subjectsRaw = subjectIds.length > 0
		? await client.entities.subjects.list(entitiesByIds(subjectIds))
		: [];

	return mapTimetableSchedules(
		classGroupId,
		schedulesRaw ?? [],
		classSubjectsRaw ?? [],
		subjectsRaw ?? [],
	);
}

import type { GenerateClassResult } from '$lib/api/mutations/timetable-generation.mutations';
import type { components } from '$lib/api/schema';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { Activity, PlanningEvent, Student, Subject, TimetableSchedule } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import {
  generateClassTimetable,
  publishClassTimetable,
  republishClassTimetable,
  resolveClassTimetableSpace,
} from '$lib/api/mutations/timetable-generation.mutations';
import { loadClassPlanning } from '$lib/api/planning-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { buildTimetablePlacementParameters } from '$lib/components/school/scheduling/timetable-placement-parameters';
import { formatDateInput } from '$lib/date/format';
import { entityVersions } from '$lib/entity-versions.svelte';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { toast } from '$lib/toast.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';
import { getContext, setContext } from 'svelte';

export type TimetableGenerationOptions = components['schemas']['TimetableGenerationOptions'];

const TIMETABLE_VERSION_FAMILIES = ['planning', 'teacherUnavailabilities'] as const satisfies readonly EntityVersionKey[];
const KEY = Symbol('timetable-page-state');

function apiMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    const message = (error.body as { message?: unknown }).message;
    if (typeof message === 'string')
      return message;
  }
  return error instanceof Error ? error.message : 'Timetable operation failed.';
}

export class TimetablePageState {
	events = $state<PlanningEvent[]>([]);
	schedules = $state<TimetableSchedule[]>([]);
	students = $state<Student[]>([]);
	subjects = $state<Subject[]>([]);
	activities = $state<Activity[]>([]);
  generationResult = $state<GenerateClassResult | null>(null);
	teacherUnavailabilities = $state<components['schemas']['TeacherUnavailability'][]>([]);
	classSubjects = $state<components['schemas']['ClassSubject'][]>([]);
	subjectLabels = $state<Record<string, string>>({});
  busy = $state(false);
	spaceCellCount = $state(0);
	focusDate = $state('');
	activeRange = $state<{ startDate: string; endDate: string } | null>(null);

  private readonly versions = new RouteVersionSnapshot(TIMETABLE_VERSION_FAMILIES);

  constructor(readonly classId: string) {}

	get periodRange() {
		if (this.activeRange) {
			return this.activeRange;
		}
		const period = academicContext.period;
		const year = academicContext.year;
		return {
			startDate: formatDateInput(period?.startDate ?? year?.startDate),
			endDate: formatDateInput(period?.endDate ?? year?.endDate),
		};
	}

	seedEvents(events: PlanningEvent[]) {
		this.events = events;
	}

	seedData(data: {
		planning: PlanningEvent[];
		schedules: TimetableSchedule[];
		people: { students: Student[] };
		subjects: Subject[];
		activities: Activity[];
	}) {
		this.events = data.planning;
		this.schedules = data.schedules;
		this.students = data.people.students;
		this.subjects = data.subjects;
		this.activities = data.activities;
    this.versions.markLoaded();
	}

  async invalidateIfStale() {
    if (!this.versions.isStale()) {
      return;
    }
    await Promise.all([this.refresh(), this.loadTeacherConstraints()]);
  }

  async refresh() {
    this.seedEvents(await loadClassPlanning(getBrowserSchoolClient(), this.classId, {
      periodId: academicContext.periodId,
    }));
  }

  async loadTeacherConstraints() {
		const client = getBrowserSchoolClient();
		const classSubjects = await client.entities.classSubjects.list({ classGroupId: this.classId });
		this.classSubjects = classSubjects;
		const subjectIds = classSubjects.map(row => row.subjectId);
		const subjects = subjectIds.length
			? await client.entities.subjects.list({ id: { $in: subjectIds } })
			: [];
		this.subjectLabels = Object.fromEntries(subjects.map(subject => [subject.id, subject.name]));
    const assignments = classSubjects.length
      ? await client.entities.teacherAssignments.list({
          classSubjectId: { $in: classSubjects.map(row => row.id) },
          academicYearId: academicContext.yearId,
          status: 'active',
        })
      : [];
    const teacherIds = assignments
      .map(row => row.teacherId)
      .filter((teacherId, index, values) => values.indexOf(teacherId) === index);
    this.teacherUnavailabilities = teacherIds.length
      ? await client.entities.teacherUnavailabilities.list({
          teacherId: { $in: teacherIds },
          academicYearId: academicContext.yearId,
          isActive: true,
        })
      : [];
  }

  async resolveSpace(startDate: string, endDate: string) {
		const normalizedStart = formatDateInput(startDate);
		const normalizedEnd = formatDateInput(endDate);
		if (!academicContext.yearId || !normalizedStart || !normalizedEnd) {
			this.spaceCellCount = 0;
			return;
		}
		try {
			const cells = await resolveClassTimetableSpace({
				classGroupId: this.classId,
				academicYearId: academicContext.yearId,
				startDate: normalizedStart,
				endDate: normalizedEnd,
			});
			this.spaceCellCount = cells.length;
		}
		catch (error) {
			this.spaceCellCount = 0;
			toast.error(apiMessage(error));
		}
	}

  generatedCounts(startDate: string, endDate: string) {
    const inRange = this.events.filter((event) => {
      const date = event.startsAt.slice(0, 10);
      return date >= startDate && date <= endDate;
    });
    return {
      draft: inRange.filter(event => event.timetableGenerated === 'draft').length,
      published: inRange.filter(event => event.timetableGenerated === 'published').length,
    };
  }

  private async run<T>(request: () => Promise<T>): Promise<T | null> {
    this.busy = true;
    try {
      const result = await request();
      entityVersions.bump('planning');
      await this.refresh();
      return result;
    }
    catch (error) {
      toast.error(apiMessage(error));
      return null;
    }
    finally {
      this.busy = false;
    }
  }

  async generate(input: {
    startDate: string;
    endDate: string;
    options?: TimetableGenerationOptions;
    periodsPerWeekByClassSubjectId?: Record<string, number>;
  }) {
    const result = await this.run(() => generateClassTimetable({
      classGroupId: this.classId,
      academicYearId: academicContext.yearId,
      startDate: input.startDate,
      endDate: input.endDate,
      options: input.options,
      placementParameters: buildTimetablePlacementParameters(
        { periodsPerWeekByClassSubjectId: input.periodsPerWeekByClassSubjectId },
        this.classSubjects,
      ),
    }));
		if (result) {
			this.generationResult = result;
			this.activeRange = { startDate: input.startDate, endDate: input.endDate };
      this.focusDate = result.placements[0]?.cell.date ?? input.startDate;
    }
    return result;
  }

  async publish(startDate: string, endDate: string, policy: 'fail' | 'skip') {
    return this.run(() => publishClassTimetable({
      classGroupId: this.classId,
      startDate,
      endDate,
      sessionConflictPolicy: policy,
    }));
  }

	async republish(input: {
		startDate: string;
		endDate: string;
		policy: 'fail' | 'skip';
		options?: TimetableGenerationOptions;
		periodsPerWeekByClassSubjectId?: Record<string, number>;
	}) {
    const result = await this.run(() => republishClassTimetable({
      classGroupId: this.classId,
      academicYearId: academicContext.yearId,
      startDate: input.startDate,
      endDate: input.endDate,
			options: input.options,
			placementParameters: buildTimetablePlacementParameters(
				{ periodsPerWeekByClassSubjectId: input.periodsPerWeekByClassSubjectId },
				this.classSubjects,
			),
      sessionConflictPolicy: input.policy,
    }));
		if (result) {
			this.generationResult = result.generation;
			this.activeRange = { startDate: input.startDate, endDate: input.endDate };
      this.focusDate = result.generation.placements[0]?.cell.date ?? input.startDate;
    }
    return result;
  }
}

export function setTimetablePageState(state: TimetablePageState) {
  setContext(KEY, state);
}

export function getTimetablePageState() {
  return getContext<TimetablePageState>(KEY);
}

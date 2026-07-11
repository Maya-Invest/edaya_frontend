import type { GenerateSchoolResult } from '$lib/api/mutations/timetable-generation.mutations';
import type { components } from '$lib/api/schema';
import type { ClassNode } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import {
  generateSchoolTimetable,
  publishClassTimetable,
} from '$lib/api/mutations/timetable-generation.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { formatDateInput } from '$lib/date/format';
import { entityVersions } from '$lib/entity-versions.svelte';
import { toast } from '$lib/toast.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';
import { sortTimetableClasses } from './timetable-planning';

export type TimetableGenerationOptions = components['schemas']['TimetableGenerationOptions'];
export type ClassSubject = components['schemas']['ClassSubject'];

export interface TimetablePlanningRow {
  classGroup: ClassNode;
  draftCount: number;
  publishedCount: number;
  placementCount: number | null;
  unmetWorkloadCount: number | null;
}

function apiMessage(error: unknown): string {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    const message = (error.body as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return error instanceof Error ? error.message : 'Timetable operation failed.';
}

export class TimetablePlanningPageState {
  sessions = $state<components['schemas']['LessonSession'][]>([]);
	classSubjects = $state<ClassSubject[]>([]);
	subjectLabels = $state<Record<string, string>>({});
	generationResult = $state<GenerateSchoolResult | null>(null);
	busy = $state(false);
	loadStatus = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	loadError = $state('');
	activeRange = $state<{ startDate: string; endDate: string } | null>(null);

	get range() {
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

	resetRange() {
		this.activeRange = null;
	}

  get classes() {
    return sortTimetableClasses(
      academicContext.classes.filter(row => row.academicYearId === academicContext.yearId),
      academicContext.gradeLevels,
    );
  }

  get rows(): TimetablePlanningRow[] {
    const range = this.range;
    return this.classes.map((classGroup) => {
      const sessions = this.sessions.filter((session) => {
        const date = String(session.startsAt).slice(0, 10);
        return session.classGroupId === classGroup.id && date >= range.startDate && date <= range.endDate;
      });
      const diagnostics = this.generationResult?.classGroups.find(result => result.classGroupId === classGroup.id);
      return {
        classGroup,
        draftCount: sessions.filter(session => session.timetableGenerated === 'draft').length,
        publishedCount: sessions.filter(session => session.timetableGenerated === 'published').length,
        placementCount: diagnostics?.placements.length ?? null,
        unmetWorkloadCount: diagnostics?.unmetWorkloads.length ?? null,
      };
    });
  }

  async load() {
    this.loadStatus = 'loading';
    this.loadError = '';
    try {
      const client = getBrowserSchoolClient();
      const classIds = this.classes.map(row => row.id);
      const [sessions, classSubjects] = await Promise.all([
        classIds.length
          ? client.entities.lessonSessions.list({ classGroupId: { $in: classIds } })
          : Promise.resolve([]),
        classIds.length
          ? client.entities.classSubjects.list({ classGroupId: { $in: classIds } })
          : Promise.resolve([]),
      ]);
      this.sessions = sessions;
      this.classSubjects = classSubjects;
      const subjectIds = classSubjects.map(row => row.subjectId);
      const subjects = subjectIds.length
        ? await client.entities.subjects.list({ id: { $in: subjectIds } })
        : [];
      this.subjectLabels = Object.fromEntries(subjects.map(subject => [subject.id, subject.name]));
      this.loadStatus = 'ready';
    }
    catch (error) {
      this.loadStatus = 'error';
      this.loadError = apiMessage(error);
      throw error;
    }
  }

  private async run<T>(request: () => Promise<T>): Promise<T | null> {
    this.busy = true;
    try {
      const result = await request();
      entityVersions.bump('planning');
      await this.load();
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
    const result = await this.run(() => generateSchoolTimetable({
      academicYearId: academicContext.yearId,
      startDate: input.startDate,
      endDate: input.endDate,
      options: input.options,
      placementParameters: input.periodsPerWeekByClassSubjectId
        ? { periodsPerWeekByClassSubjectId: input.periodsPerWeekByClassSubjectId }
        : undefined,
    }));
		if (result) {
			this.generationResult = result;
			this.activeRange = { startDate: input.startDate, endDate: input.endDate };
    }
    return result;
  }

  publish(classGroupId: string, startDate: string, endDate: string, policy: 'fail' | 'skip') {
    return this.run(() => publishClassTimetable({
      classGroupId,
      startDate,
      endDate,
      sessionConflictPolicy: policy,
    }));
  }
}

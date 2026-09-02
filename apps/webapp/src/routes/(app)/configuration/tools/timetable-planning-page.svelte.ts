import type { GenerateSchoolResult } from '$lib/api/mutations/timetable-generation.mutations';
import type { components } from '$lib/api/schema';
import type { TimetableMutationResult } from '$lib/components/school/scheduling/timetable-generation-errors';
import type { TimetablePlacementOverrides } from '$lib/components/school/scheduling/timetable-placement-parameters';
import type { ClassNode } from '$lib/types/school';
import type { TimetableGenerationProgress } from './timetable-planning';
import { academicContext } from '$lib/academic/context.svelte';
import {
  generateClassTimetable,
  publishClassTimetable,
} from '$lib/api/mutations/timetable-generation.mutations';
import { academicYearPlanningRange } from '$lib/api/planning-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { teacherNameForClassSubject } from '$lib/api/teacher-display';
import { catalogSubjectName } from '$lib/i18n/catalog-label';
import { lang } from '$lib/i18n';
import { get } from 'svelte/store';
import {
  parseTimetableGenerationError,
  timetableErrorMessage,

} from '$lib/components/school/scheduling/timetable-generation-errors';
import {
  buildTimetablePlacementParameters,

} from '$lib/components/school/scheduling/timetable-placement-parameters';
import { formatDateInput } from '$lib/date/format';
import { entityVersions } from '$lib/entity-versions.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { SvelteSet } from 'svelte/reactivity';
import { get } from 'svelte/store';
import {
  generateSchoolTimetableSequentially,
  SequentialTimetableGenerationError,
  sortTimetableClasses,

} from './timetable-planning';

function translateTimetable(key: string) {
  return get(t)(key);
}

export type TimetableGenerationOptions = components['schemas']['TimetableGenerationOptions'];
export type ClassSubject = components['schemas']['ClassSubject'];
export type { TimetableGenerationError, TimetableMutationResult } from '$lib/components/school/scheduling/timetable-generation-errors';

export interface TimetablePlanningRow {
  classGroup: ClassNode;
  draftCount: number;
  publishedCount: number;
  placementCount: number | null;
  unmetWorkloadCount: number | null;
}

export class TimetablePlanningPageState {
  sessions = $state<components['schemas']['LessonSession'][]>([]);
  classSubjects = $state<ClassSubject[]>([]);
  subjectLabels = $state<Record<string, string>>({});
  teacherLabelsByClassSubjectId = $state<Record<string, string>>({});
  generationResult = $state<GenerateSchoolResult | null>(null);
  generationProgress = $state<TimetableGenerationProgress | null>(null);
  busy = $state(false);
  loadStatus = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  loadError = $state('');
  activeRange = $state<{ startDate: string; endDate: string } | null>(null);

  get academicYearRange() {
    return academicYearPlanningRange(academicContext.year);
  }

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
    const range = this.academicYearRange;
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

  get eligibleClassCount() {
    return this.rows.length;
  }

  get canGenerateSchoolInitial() {
    return this.eligibleClassCount > 0;
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
      const classSubjectIds = classSubjects.map(row => row.id);
      const [subjects, teacherAssignments] = await Promise.all([
        subjectIds.length
          ? client.entities.subjects.list({ id: { $in: subjectIds } })
          : Promise.resolve([]),
        classSubjectIds.length
          ? client.entities.teacherAssignments.list({
            classSubjectId: { $in: classSubjectIds },
            academicYearId: academicContext.yearId,
            status: 'active',
          })
          : Promise.resolve([]),
      ]);
      this.subjectLabels = Object.fromEntries(subjects.map(subject => [
        subject.id,
        catalogSubjectName(subject.name, get(lang), subject.code),
      ]));
      const teacherIds = [...new SvelteSet(teacherAssignments.map(row => row.teacherId))];
      const teachers = teacherIds.length
        ? await client.entities.teachers.list({ id: { $in: teacherIds } })
        : [];
      const instructorSources = {
        teachersRaw: teachers,
        teacherAssignmentsRaw: teacherAssignments,
        staffMembersRaw: [],
        staffAssignmentsRaw: [],
      };
      this.teacherLabelsByClassSubjectId = Object.fromEntries(
        classSubjectIds.map(classSubjectId => [
          classSubjectId,
          teacherNameForClassSubject(classSubjectId, instructorSources, ''),
        ]),
      );
      this.loadStatus = 'ready';
    }
    catch (error) {
      this.loadStatus = 'error';
      this.loadError = timetableErrorMessage(error, translateTimetable);
      throw error;
    }
  }

  private async runMutation<T>(
    request: () => Promise<T>,
    options?: { reportInModal?: boolean },
  ): Promise<TimetableMutationResult<T>> {
    this.busy = true;
    try {
      const result = await request();
      entityVersions.bump('planning');
      await this.load();
      return { ok: true, value: result };
    }
    catch (error) {
      const parsed = parseTimetableGenerationError(error, translateTimetable);
      if (!options?.reportInModal) {
        toast.error(parsed.summary);
      }
      return { ok: false, error: parsed };
    }
    finally {
      this.busy = false;
    }
  }

  private async run<T>(request: () => Promise<T>): Promise<T | null> {
    const outcome = await this.runMutation(request);
    return outcome.ok ? outcome.value : null;
  }

  async generate(input: {
    startDate: string;
    endDate: string;
    options?: TimetableGenerationOptions;
  } & TimetablePlacementOverrides): Promise<TimetableMutationResult<GenerateSchoolResult>> {
    this.busy = true;
    this.generationProgress = null;
    try {
      const result = await generateSchoolTimetableSequentially({
        academicYearId: academicContext.yearId,
        startDate: input.startDate,
        endDate: input.endDate,
        options: input.options,
        placementParameters: buildTimetablePlacementParameters(input),
        classes: this.classes,
        classSubjects: this.classSubjects,
        generateClass: generateClassTimetable,
        onProgress: (progress) => {
          this.generationProgress = progress;
        },
      });
      this.generationResult = result;
      this.activeRange = { startDate: input.startDate, endDate: input.endDate };
      entityVersions.bump('planning');
      await this.load();
      return { ok: true, value: result };
    }
    catch (error) {
      if (error instanceof SequentialTimetableGenerationError) {
        entityVersions.bump('planning');
        await this.load();
        const parsed = parseTimetableGenerationError(error.cause, translateTimetable);
        const partial = get(t)('timetable.generatePartialFailure', {
          className: error.failedClass.name,
          completed: error.completed.length,
          total: error.total,
        });
        return {
          ok: false,
          error: {
            ...parsed,
            summary: `${partial} ${parsed.summary}`,
          },
        };
      }
      return { ok: false, error: parseTimetableGenerationError(error, translateTimetable) };
    }
    finally {
      this.busy = false;
      this.generationProgress = null;
    }
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

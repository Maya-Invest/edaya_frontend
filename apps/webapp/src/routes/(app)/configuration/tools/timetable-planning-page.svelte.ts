import type { GenerateSchoolResult } from '$lib/api/mutations/timetable-generation.mutations';
import type { components } from '$lib/api/schema';
import type { TimetablePlacementOverrides } from '$lib/scheduling/timetable-placement-parameters';
import type { ClassNode } from '$lib/types/school';
import type { TimetableMutationResult } from './lib/timetable-generation-errors';
import { academicContext } from '$lib/academic/context.svelte';
import { executeMutation } from '$lib/api/mutations/execute-mutation';
import {
  generateSchoolTimetable,
} from '$lib/api/mutations/timetable-generation.mutations';
import { academicYearPlanningRange } from '$lib/api/planning-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { teacherNameForClassSubject } from '$lib/api/teacher-display';
import { formatDateInput } from '$lib/date/format';
import { entityVersions } from '$lib/entity-versions.svelte';
import { lang, t } from '$lib/i18n';
import { catalogSubjectName } from '$lib/i18n/catalog-label';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import {
  buildTimetablePlacementParameters,

} from '$lib/scheduling/timetable-placement-parameters';
import { toast } from '$lib/toast.svelte';
import { SvelteSet } from 'svelte/reactivity';
import { get } from 'svelte/store';
import {
  parseTimetableGenerationError,
  timetableErrorMessage,

} from './lib/timetable-generation-errors';
import {
  selectedTimetableClasses,
  sortTimetableClasses,

} from './timetable-planning';

function translateTimetable(key: string, vars?: Record<string, string | number>) {
  return get(t)(key, vars);
}

export type TimetableGenerationOptions = components['schemas']['TimetableGenerationOptions'];
export type ClassSubject = components['schemas']['ClassSubject'];
export type { TimetableGenerationError, TimetableMutationResult } from './lib/timetable-generation-errors';

export interface TimetablePlanningRow {
  classGroup: ClassNode;
  placementCount: number | null;
  unmetWorkloadCount: number | null;
}

export class TimetablePlanningPageState {
  private readonly versions = new RouteVersionSnapshot(['planning', 'subjects', 'teachers', 'school', 'periodDefinitions']);

  async invalidateIfStale() {
    if (!this.versions.hasLoaded() || !this.versions.isStale() || this.busy)
      return;
    try {
      await this.load();
    }
    catch { /* Keep stale for the next visit; PageQuery owns first-paint errors. */ }
  }

  sessions = $state<components['schemas']['LessonSession'][]>([]);
  classSubjects = $state<ClassSubject[]>([]);
  subjectLabels = $state<Record<string, string>>({});
  teacherLabelsByClassSubjectId = $state<Record<string, string>>({});
  generationResult = $state<GenerateSchoolResult | null>(null);
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
    return this.classes.map((classGroup) => {
      const diagnostics = this.generationResult?.classGroups.find(result => result.classGroupId === classGroup.id);
      return {
        classGroup,
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
      this.versions.markLoaded();
    }
    catch (error) {
      this.loadStatus = 'error';
      this.loadError = timetableErrorMessage(error, translateTimetable);
      throw error;
    }
  }

  private describeMutationError(error: unknown) {
    return parseTimetableGenerationError(error, translateTimetable, {
      classLabels: Object.fromEntries(this.classes.map(row => [row.id, row.name])),
      classSubjectLabels: Object.fromEntries(this.classSubjects.map(row => [row.id, this.subjectLabels[row.subjectId]]).filter((entry): entry is [string, string] => Boolean(entry[1]))),
      locale: get(lang) === 'fr' ? 'fr-FR' : 'en-US',
    });
  }

  private async runMutation<T>(
    request: () => Promise<T>,
    options?: { reportInModal?: boolean },
  ): Promise<TimetableMutationResult<T>> {
    this.busy = true;
    let failure: ReturnType<typeof parseTimetableGenerationError> | undefined;
    try {
      const result = await executeMutation({
        request: async () => {
          try {
            return await request();
          }
          catch (error) {
            failure = this.describeMutationError(error);
            throw error;
          }
        },
        onSuccess: () => this.load(),
        versionKeys: ['planning'],
      }, {
        bump: key => entityVersions.bump(key),
        success: message => toast.success(message),
        error: (message) => {
          if (!failure || !options?.reportInModal)
            toast.error(failure?.summary ?? message);
        },
        translate: translateTimetable,
      });
      return result !== null
        ? { ok: true, value: result }
        : { ok: false, error: failure! };
    }
    finally { this.busy = false; }
  }

  async generate(input: {
    classGroupIds: string[];
    startDate: string;
    endDate: string;
    options?: TimetableGenerationOptions;
  } & TimetablePlacementOverrides): Promise<TimetableMutationResult<GenerateSchoolResult>> {
    const academicYearId = academicContext.yearId;
    const schoolId = academicContext.schools[0]?.id;
    return this.runMutation(async () => {
        let classes: ClassNode[];
        try {
          classes = selectedTimetableClasses(this.classes, input.classGroupIds);
        }
        catch {
          throw new Error(translateTimetable('timetable.invalidClassSelection'));
        }
        this.generationResult = null;
        const result = await generateSchoolTimetable({
          academicYearId,
          startDate: input.startDate,
          endDate: input.endDate,
          options: input.options,
          placementParameters: buildTimetablePlacementParameters(input),
          classGroupIds: classes.map(row => row.id),
        });
        if (academicContext.yearId === academicYearId && academicContext.schools[0]?.id === schoolId) {
          this.generationResult = result;
          this.activeRange = { startDate: input.startDate, endDate: input.endDate };
        }
        return result;
      }, { reportInModal: true });
  }
}

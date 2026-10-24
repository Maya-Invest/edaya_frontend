import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { Subject } from '$lib/types/school';
import type { SubjectsPageSlice } from './lib/subjects-helpers';
import { createScheduleMutation } from '$lib/api/mutations/schedule.mutations';
import { removeSubjectMutation } from '$lib/api/mutations/subject-offerings.mutations';
import { createSubjectForClassMutation, createSubjectForGradeLevelMutation, updateSubjectMutation } from '$lib/api/mutations/subject.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadSubjectCategories } from '$lib/api/subject-categories-data';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { loadSubjectParticipationRevisions } from '$lib/subjects/update-subject';
import { getContext, setContext } from 'svelte';
import {
  emptySubjectsSlice,
  logEntriesForSubject,
  subjectIdFromUrl,
} from './lib/subjects-helpers';
import { loadSubjectsSlice, querySubjectsListPage } from './lib/subjects-queries';
import { runSubjectsRouteMutation } from './lib/subjects-route-mutation';

const SUBJECTS_VERSION_FAMILIES = ['subjects', 'planning', 'teachers', 'staff'] as const satisfies readonly EntityVersionKey[];

const SUBJECTS_PAGE_STATE_KEY = Symbol('subjects-page-state');

export type { SubjectsPageSlice };

export class SubjectsPageState {
  onLoadParticipationRevisions = (subjectId: string) => loadSubjectParticipationRevisions(getBrowserSchoolClient(), subjectId);
  onLoadCategories = (schoolId: string) => loadSubjectCategories(getBrowserSchoolClient(), schoolId);

  loadSubjectCategoriesForForm = (...args: Parameters<typeof loadSubjectCategories> extends [unknown, ...infer Rest] ? Rest : never) => loadSubjectCategories(getBrowserSchoolClient(), ...args);

  performUpdateSubject = async (...args: Parameters<typeof updateSubjectMutation>) => {
    const saved = await updateSubjectMutation(...args);
    if (saved) {
      await this.refreshSlice();
    }
    return saved;
  };

  performCreateSubjectForClass = (...args: Parameters<typeof createSubjectForClassMutation>) => createSubjectForClassMutation(...args);

  performCreateSchedule = (...args: Parameters<typeof createScheduleMutation>) => createScheduleMutation(...args);

  performRemoveSubjectFromGradeLevel = (...args: Parameters<typeof removeSubjectMutation>) => removeSubjectMutation(...args);

  performCreateSubjectForGradeLevel = (...args: Parameters<typeof createSubjectForGradeLevelMutation>) => createSubjectForGradeLevelMutation(...args);

  slice = $state<SubjectsPageSlice | null>(null);

  private readonly versions = new RouteVersionSnapshot(SUBJECTS_VERSION_FAMILIES);

  constructor(private readonly getUrl: () => URL) {}

  applySlice(data: SubjectsPageSlice) {
    this.slice = data;
    this.versions.markLoaded();
  }

  seed(data: Partial<SubjectsPageSlice>) {
    if (this.slice) {
      return;
    }
    this.applySlice({ ...emptySubjectsSlice(), ...data });
  }

  clear() {
    this.slice = null;
  }

  get selectedId() {
    return subjectIdFromUrl(this.getUrl());
  }

  get selected() {
    const subjectId = this.selectedId;
    if (!subjectId) {
      return undefined;
    }
    return this.subjectById(subjectId);
  }

  subjects() {
    return this.slice?.subjects ?? [];
  }

  logEntries() {
    return this.slice?.logEntries ?? [];
  }

  subjectById(id: string): Subject | undefined {
    return this.slice?.subjects.find(subject => subject.id === id);
  }

  logEntriesForSubject(subject: Subject) {
    if (!this.slice) {
      return [];
    }
    return logEntriesForSubject(subject.name, subject.classId, this.slice.logEntries);
  }

  appendSubject(subject: Subject) {
    if (!this.slice) {
      return;
    }
    this.slice = {
      ...this.slice,
      subjects: [...this.slice.subjects, subject].sort((left, right) =>
        left.name.localeCompare(right.name, 'fr'),
      ),
    };
  }

  patchSubject(id: string, patch: Partial<Subject>) {
    if (!this.slice) {
      return;
    }
    this.slice = {
      ...this.slice,
      subjects: this.slice.subjects.map(subject =>
        subject.id === id ? { ...subject, ...patch } : subject,
      ),
    };
  }

  removeSubject(id: string) {
    if (!this.slice) {
      return;
    }
    const removed = this.slice.subjects.find(subject => subject.id === id);
    this.slice = {
      ...this.slice,
      subjects: this.slice.subjects.filter(subject => subject.id !== id),
      logEntries: removed
        ? this.slice.logEntries.filter(entry => entry.subject !== removed.name)
        : this.slice.logEntries,
    };
  }

  queryListPage() {
    return querySubjectsListPage(this);
  }

  async refreshSlice() {
    try {
      const url = this.getUrl();
      const data = await loadSubjectsSlice(url);
      if (this.getUrl().href !== url.href)
        return;
      this.applySlice(data);
    }
    catch {
      // Keep the current row if reload fails after a persisted write.
    }
  }

  async invalidateIfStale() {
    if (!this.versions.isStale()) {
      return;
    }
    await this.refreshSlice();
  }

  async deleteSubject(input: {
    classSubjectId: string;
    successMessage?: string;
  }): Promise<boolean> {
    const client = getBrowserSchoolClient();
    const previous = this.slice?.subjects.find(subject => subject.id === input.classSubjectId);
    const previousEntries = previous && this.slice
      ? this.slice.logEntries.filter(entry => entry.subject === previous.name)
      : [];

    const result = await runSubjectsRouteMutation({
      request: () => client.entities.classSubjects.delete({ id: input.classSubjectId }),
      successMessage: input.successMessage,
      versionKeys: ['subjects'],
      apply: () => {
        this.removeSubject(input.classSubjectId);
      },
      rollback: () => {
        if (previous) {
          this.appendSubject(previous);
        }
        if (previousEntries.length > 0 && this.slice) {
          this.slice = {
            ...this.slice,
            logEntries: [...this.slice.logEntries, ...previousEntries],
          };
        }
      },
    });
    return result !== null;
  }
}

export function setSubjectsPageState(state: SubjectsPageState) {
  setContext(SUBJECTS_PAGE_STATE_KEY, state);
}

export function getSubjectsPageState() {
  return getContext<SubjectsPageState>(SUBJECTS_PAGE_STATE_KEY);
}

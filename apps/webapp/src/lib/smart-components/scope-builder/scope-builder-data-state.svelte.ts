import type { Activity, Student } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { fetchActivities } from '$lib/api/activities-data';
import { fetchPeopleSources, mapStudents } from '$lib/api/people-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchCatalogSubjectsSources } from '$lib/api/subjects-data';

export class ScopeBuilderDataState {
  students = $state<Student[]>([]);
  activities = $state<Activity[]>([]);
  gradeSubjects = $state<{ id: string; gradeLevelId: string; name: string; code?: string | null }[]>([]);
  loading = $state(false);
  loaded = $state(false);

  private loadVersion = 0;
  private contextKey = '';

  async ensureLoaded(): Promise<void> {
    const schoolId = academicContext.schools[0]?.id ?? '';
    const yearId = academicContext.yearId;
    const key = `${schoolId}:${yearId}`;
    if (this.contextKey !== key) {
      this.reset();
      this.contextKey = key;
    }
    if (this.loaded || this.loading) {
      return;
    }

    if (!schoolId) {
      return;
    }

    const version = ++this.loadVersion;
    this.loading = true;
    try {
      const client = getBrowserSchoolClient();
      const [peopleSources, activities, subjectSources] = await Promise.all([
        fetchPeopleSources(client, schoolId),
        fetchActivities(client, schoolId),
        fetchCatalogSubjectsSources(client, schoolId, yearId ?? undefined),
      ]);
      if (version !== this.loadVersion) {
        return;
      }
      this.students = mapStudents(peopleSources);
      this.activities = activities;
      this.gradeSubjects = subjectSources.subjectsRaw.map(subject => ({
        id: subject.id,
        gradeLevelId: subject.gradeLevelId,
        name: subject.name,
        code: subject.code,
      }));
      this.loaded = true;
    }
    finally {
      if (version === this.loadVersion) {
        this.loading = false;
      }
    }
  }

  subjectsForGrade(gradeLevelId: string) {
    return this.gradeSubjects.filter(subject => subject.gradeLevelId === gradeLevelId);
  }

  reset() {
    this.loadVersion += 1;
    this.students = [];
    this.activities = [];
    this.gradeSubjects = [];
    this.loading = false;
    this.loaded = false;
  }
}

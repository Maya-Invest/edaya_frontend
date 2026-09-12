import type { Activity, Student, Subject } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { fetchActivities } from '$lib/api/activities-data';
import { fetchPeopleSources, mapStudents } from '$lib/api/people-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchCatalogSubjectsSources } from '$lib/api/subjects-data';

export class ScopeBuilderDataState {
  students = $state<Student[]>([]);
  activities = $state<Activity[]>([]);
  subjects = $state<Subject[]>([]);
  gradeSubjects = $state<{ id: string; gradeLevelId: string; name: string; code?: string | null }[]>([]);
  loading = $state(false);
  loaded = $state(false);

  private loadVersion = 0;

  async ensureLoaded(): Promise<void> {
    if (this.loaded || this.loading) {
      return;
    }

    const schoolId = academicContext.schools[0]?.id ?? '';
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
        fetchCatalogSubjectsSources(client, schoolId),
      ]);
      if (version !== this.loadVersion) {
        return;
      }
      this.students = mapStudents(peopleSources);
      this.activities = activities;
      const names = Object.fromEntries(subjectSources.subjectsRaw.map(subject => [subject.id, subject]));
      this.subjects = subjectSources.classSubjectsRaw.map(subject => ({
        id: subject.id,
        classId: subject.classGroupId,
        name: names[subject.subjectId]?.name ?? subject.subjectId,
        code: names[subject.subjectId]?.code,
        teacher: '',
        color: 'mint',
        description: '',
        category: 'Scientifique',
        hoursPerWeek: null,
      }));
      this.gradeSubjects = subjectSources.gradeLevelSubjectsRaw.map(subject => ({
        id: subject.id,
        gradeLevelId: subject.gradeLevelId,
        name: names[subject.subjectId]?.name ?? subject.subjectId,
        code: names[subject.subjectId]?.code,
      }));
      this.loaded = true;
    }
    finally {
      if (version === this.loadVersion) {
        this.loading = false;
      }
    }
  }

  subjectsForClass(classGroupId: string): Subject[] {
    return this.subjects.filter(subject => subject.classId === classGroupId);
  }

  subjectsForGrade(gradeLevelId: string) {
    return this.gradeSubjects.filter(subject => subject.gradeLevelId === gradeLevelId);
  }

  reset() {
    this.loadVersion += 1;
    this.students = [];
    this.activities = [];
    this.subjects = [];
    this.gradeSubjects = [];
    this.loading = false;
    this.loaded = false;
  }
}

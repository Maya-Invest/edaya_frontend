import type { Activity, Student, Subject } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { fetchActivities } from '$lib/api/activities-data';
import { fetchPeopleSources, mapStudents } from '$lib/api/people-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchSchoolSubjectsSources, mapAllClassSubjects } from '$lib/api/subjects-data';

export class ScopeBuilderDataState {
	students = $state<Student[]>([]);
	activities = $state<Activity[]>([]);
	subjects = $state<Subject[]>([]);
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
				fetchSchoolSubjectsSources(client, schoolId),
			]);
			if (version !== this.loadVersion) {
				return;
			}
			this.students = mapStudents(peopleSources);
			this.activities = activities;
			this.subjects = mapAllClassSubjects(subjectSources);
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

	reset() {
		this.loadVersion += 1;
		this.students = [];
		this.activities = [];
		this.subjects = [];
		this.loading = false;
		this.loaded = false;
	}
}

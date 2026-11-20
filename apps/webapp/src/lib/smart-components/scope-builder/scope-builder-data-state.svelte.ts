import type { ActivityOption } from '$lib/api/activities-data';
import type { GradeSubjectOption } from '$lib/api/subjects-data';
import { fetchActivityOptions } from '$lib/api/activities-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchGradeSubjectOptions } from '$lib/api/subjects-data';

export class ScopeBuilderDataState {
	activities = $state<ActivityOption[]>([]);
	gradeSubjects = $state<GradeSubjectOption[]>([]);
	loading = $state(false);
	failed = $state(false);

	async load(grain: 'activity' | 'subject', schoolId: string, yearId: string, signal: AbortSignal) {
		this.loading = true;
		try {
			const client = getBrowserSchoolClient();
			if (grain === 'activity') {
				const activities = await fetchActivityOptions(client, schoolId, signal);
				if (!signal.aborted)
					this.activities = activities;
			}
			else {
				const subjects = await fetchGradeSubjectOptions(client, schoolId, yearId || undefined, signal);
				if (!signal.aborted)
					this.gradeSubjects = subjects;
			}
		}
		catch {
			if (!signal.aborted)
				this.failed = true;
		}
		finally {
			if (!signal.aborted)
				this.loading = false;
		}
	}

	subjectsForGrade(gradeLevelId: string) {
		return this.gradeSubjects.filter(subject => subject.gradeLevelId === gradeLevelId);
	}

	reset() {
		this.activities = [];
		this.gradeSubjects = [];
		this.loading = false;
		this.failed = false;
	}
}

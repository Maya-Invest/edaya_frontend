import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { fetchClassAssessmentsSources } from './assessments-data';
import { fetchClassHomeworkSources } from './homework-data';
import { fetchClassPlanningSources } from './planning-data';
import { fetchClassSubjectsSources } from './subjects-data';
import { fetchClassTeachingLogSources } from './teaching-log-data';
import { createRecordingSchoolClient, entityListRequests } from './test/recording-school-client';

const classGroupId = 'class-6a';
const periodId = 'period-1';

function listEnvelope<T>(items: readonly T[]) {
	return items.map(item => ({ data: item }));
}

function emptyLists(count: number) {
	return Array.from({ length: count }, () => listEnvelope([]));
}

describe('class route scoped loading', () => {
	it('loads planning data with class and referenced-entity filters', async () => {
		const session = {
			id: 'session-1',
			schoolId: SEED_SCHOOL_ID,
			classGroupId,
			classSubjectId: 'cs-math',
			title: 'Math',
			startsAt: '2026-06-02T08:00:00.000Z',
			endsAt: '2026-06-02T09:00:00.000Z',
		};
		const classSubject = {
			id: 'cs-math',
			schoolId: SEED_SCHOOL_ID,
			classGroupId,
			subjectId: 'subj-math',
		};

		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([session]),
			listEnvelope([classSubject]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([{ id: 'subj-math', schoolId: SEED_SCHOOL_ID, name: 'Mathematics' }]),
			...emptyLists(2),
		]);

		await fetchClassPlanningSources(client, classGroupId);

		expect(entityListRequests(requests, 'sessions')[0]?.body).toEqual({ classGroupId });
		expect(entityListRequests(requests, 'class-subjects')[0]?.body).toEqual({ classGroupId });
		expect(entityListRequests(requests, 'subjects')[0]?.body).toEqual({
			id: { $in: ['subj-math'] },
		});
		for (const request of entityListRequests(requests, 'staff-members')) {
			expect(request.body).not.toEqual({});
		}
	});

	it('loads class subjects with scoped class-subject and referenced subject filters', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'cs-math',
				schoolId: SEED_SCHOOL_ID,
				classGroupId,
				subjectId: 'subj-math',
			}]),
			listEnvelope([{ id: 'subj-math', schoolId: SEED_SCHOOL_ID, name: 'Mathematics' }]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
		]);

		await fetchClassSubjectsSources(client, classGroupId);

		expect(entityListRequests(requests, 'class-subjects')[0]?.body).toEqual({ classGroupId });
		expect(entityListRequests(requests, 'subjects')[0]?.body).toEqual({
			id: { $in: ['subj-math'] },
		});
	});

	it('loads class evaluations with scoped assessment and enrollment filters', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'assessment-1',
				schoolId: SEED_SCHOOL_ID,
				classGroupId,
				classSubjectId: 'cs-math',
				title: 'Quiz',
				maxScore: 20,
			}]),
			listEnvelope([{
				id: 'cs-math',
				schoolId: SEED_SCHOOL_ID,
				classGroupId,
				subjectId: 'subj-math',
			}]),
			listEnvelope([{
				id: 'enrollment-1',
				schoolId: SEED_SCHOOL_ID,
				studentId: 'student-1',
				classGroupId,
				status: 'active',
			}]),
			listEnvelope([]),
			listEnvelope([{ id: 'subj-math', schoolId: SEED_SCHOOL_ID, name: 'Mathematics' }]),
		]);

		await fetchClassAssessmentsSources(client, classGroupId, periodId);

		expect(entityListRequests(requests, 'assessments')[0]?.body).toEqual({
			classGroupId,
			periodId,
		});
		expect(entityListRequests(requests, 'enrollments')[0]?.body).toEqual({
			classGroupId,
			status: 'active',
		});
		expect(entityListRequests(requests, 'assessment-results')[0]?.body).toEqual({
			assessmentId: { $in: ['assessment-1'] },
			studentId: { $in: ['student-1'] },
		});
	});

	it('loads class homework with scoped assignment and submission filters', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'hw-1',
				schoolId: SEED_SCHOOL_ID,
				classGroupId,
				classSubjectId: 'cs-math',
				title: 'Exercises',
				type: 'homework',
				dueDate: '2026-06-10',
			}]),
			listEnvelope([{
				id: 'cs-math',
				schoolId: SEED_SCHOOL_ID,
				classGroupId,
				subjectId: 'subj-math',
			}]),
			listEnvelope([]),
			listEnvelope([{ id: 'subj-math', schoolId: SEED_SCHOOL_ID, name: 'Mathematics' }]),
		]);

		await fetchClassHomeworkSources(client, classGroupId);

		expect(entityListRequests(requests, 'homework-assignments')[0]?.body).toEqual({ classGroupId });
		expect(entityListRequests(requests, 'homework-submissions')[0]?.body).toEqual({
			homeworkAssignmentId: { $in: ['hw-1'] },
		});
	});

	it('loads class teaching log entries with class-scoped logbook filters', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'log-1',
				schoolId: SEED_SCHOOL_ID,
				classGroupId,
				classSubjectId: 'cs-math',
				date: '2026-06-02',
				chapter: 'Fractions',
				content: 'Intro',
			}]),
			listEnvelope([{
				id: 'cs-math',
				schoolId: SEED_SCHOOL_ID,
				classGroupId,
				subjectId: 'subj-math',
			}]),
			listEnvelope([]),
			listEnvelope([{ id: 'subj-math', schoolId: SEED_SCHOOL_ID, name: 'Mathematics' }]),
			listEnvelope([]),
		]);

		await fetchClassTeachingLogSources(client, classGroupId);

		expect(entityListRequests(requests, 'class-logbook-entries')[0]?.body).toEqual({ classGroupId });
		expect(entityListRequests(requests, 'class-subjects')[0]?.body).toEqual({ classGroupId });
	});
});

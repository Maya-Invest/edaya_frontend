import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { fetchClassAssessmentsSources } from '$lib/api/assessments-data';
import { CATALOG_LIST_PAGE_SIZE } from '$lib/api/entity-list-filters';
import { fetchClassHomeworkSources } from '$lib/api/homework-data';
import { defaultPlanningDateRange, fetchClassPlanningSources } from '$lib/api/planning-data';
import { fetchClassSubjectsSources } from '$lib/api/subjects-data';
import { fetchClassTeachingLogSources } from '$lib/api/teaching-log-data';
import { createRecordingSchoolClient, entityListRequests, queryRequests } from '$tests/support/recording-school-client';

const classGroupId = 'class-6a';
const periodId = 'period-1';

function listEnvelope<T>(items: readonly T[]) {
	return items.map(item => ({ data: item }));
}

function emptyLists(count: number) {
	return Array.from({ length: count }, () => listEnvelope([]));
}

function paged(body: Record<string, unknown>) {
	return {
		...body,
		$limit: CATALOG_LIST_PAGE_SIZE,
		$offset: 0,
	};
}

describe('class route scoped loading', () => {
	it('loads planning data with timetable query and referenced-entity filters', async () => {
		const range = defaultPlanningDateRange(new Date('2026-06-02T12:00:00.000Z'));
		const lessonSession = {
			id: 'ls-1',
			schoolId: SEED_SCHOOL_ID,
			classGroupId,
			scheduleId: 'sched-1',
			classSubjectId: 'cs-math',
			displayLabel: 'Math',
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
			{
				classGroupId,
				startDate: range.startDate,
				endDate: range.endDate,
				events: [{
					kind: 'lesson',
					id: 'ls-1',
					classGroupId,
					classSubjectId: 'cs-math',
					title: 'Math',
					startsAt: '2026-06-02T08:00:00.000Z',
					endsAt: '2026-06-02T09:00:00.000Z',
					lessonSessionId: 'ls-1',
				}],
			},
			listEnvelope([lessonSession]),
			listEnvelope([classSubject]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([{ id: 'subj-math', schoolId: SEED_SCHOOL_ID, name: 'Mathematics' }]),
			...emptyLists(16),
		]);

		await fetchClassPlanningSources(client, classGroupId, range);

		expect(queryRequests(requests, 'get-class-group-timetable')[0]?.body).toEqual({
			classGroupId,
			startDate: range.startDate,
			endDate: range.endDate,
		});
		expect(entityListRequests(requests, 'lesson-sessions')[0]?.body).toEqual(paged({
			id: { $in: ['ls-1'] },
		}));
		expect(entityListRequests(requests, 'class-subjects')[0]?.body).toEqual(paged({ classGroupId }));
		expect(entityListRequests(requests, 'subjects')[0]?.body).toEqual(paged({
			id: { $in: ['subj-math'] },
		}));
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

		expect(entityListRequests(requests, 'class-subjects')[0]?.body).toEqual(paged({ classGroupId }));
		expect(entityListRequests(requests, 'subjects')[0]?.body).toEqual(paged({
			id: { $in: ['subj-math'] },
		}));
	});

	it('loads class evaluations with scoped assessment and enrollment filters', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'assessment-1',
				classGroupId,
				classSubjectId: 'cs-math',
				periodId,
				title: 'Quiz',
				kind: 'quiz',
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

		expect(entityListRequests(requests, 'assessments')[0]?.body).toEqual(paged({
			classGroupId,
			periodId,
		}));
		expect(entityListRequests(requests, 'enrollments')[0]?.body).toEqual(paged({
			classGroupId,
			status: 'active',
		}));
		expect(entityListRequests(requests, 'assessment-results')[0]?.body).toEqual(paged({
			assessmentId: { $in: ['assessment-1'] },
			studentId: { $in: ['student-1'] },
		}));
	});

	it('loads class homework with scoped assessment and result filters', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'hw-1',
				classGroupId,
				classSubjectId: 'cs-math',
				periodId,
				title: 'Exercises',
				kind: 'homework',
				maxScore: 20,
				dueAt: '2026-06-10',
			}]),
			listEnvelope([{
				id: 'cs-math',
				schoolId: SEED_SCHOOL_ID,
				classGroupId,
				subjectId: 'subj-math',
			}]),
			listEnvelope([]),
			listEnvelope([{ id: 'subj-math', schoolId: SEED_SCHOOL_ID, name: 'Mathematics' }]),
			...emptyLists(8),
		]);

		await fetchClassHomeworkSources(client, classGroupId, periodId);

		expect(entityListRequests(requests, 'assessments')[0]?.body).toEqual(paged({
			classGroupId,
			periodId,
			kind: 'homework',
		}));
		expect(entityListRequests(requests, 'assessment-results')[0]?.body).toEqual(paged({
			assessmentId: { $in: ['hw-1'] },
		}));
	});

	it('loads class teaching log entries with class-scoped lesson session filters', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'ls-1',
				schoolId: SEED_SCHOOL_ID,
				classGroupId,
				scheduleId: 'sched-1',
				classSubjectId: 'cs-math',
				displayLabel: 'Fractions',
				sessionNote: 'Intro',
				startsAt: '2026-06-02T08:00:00.000Z',
				endsAt: '2026-06-02T09:00:00.000Z',
			}]),
			listEnvelope([{
				id: 'cs-math',
				schoolId: SEED_SCHOOL_ID,
				classGroupId,
				subjectId: 'subj-math',
			}]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([]),
			listEnvelope([{ id: 'subj-math', schoolId: SEED_SCHOOL_ID, name: 'Mathematics' }]),
			...emptyLists(8),
		]);

		await fetchClassTeachingLogSources(client, classGroupId);

		expect(entityListRequests(requests, 'lesson-sessions')[0]?.body).toEqual(paged({ classGroupId }));
		expect(entityListRequests(requests, 'class-subjects')[0]?.body).toEqual(paged({ classGroupId }));
	});

	it('loads 60 assessment results across two assessments of 30 students', async () => {
		const studentIds = Array.from({ length: 30 }, (_, index) => `student-${index}`);
		const enrollments = studentIds.map(studentId => ({
			id: `enrollment-${studentId}`,
			schoolId: SEED_SCHOOL_ID,
			studentId,
			classGroupId,
			status: 'active',
		}));
		const results = ['assessment-1', 'assessment-2'].flatMap(assessmentId =>
			studentIds.map(studentId => ({
				id: `${assessmentId}:${studentId}`,
				assessmentId,
				studentId,
				score: 12,
			})),
		);

		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([
				{
					id: 'assessment-1',
					classGroupId,
					classSubjectId: 'cs-math',
					periodId,
					title: 'Quiz 1',
					kind: 'quiz',
					maxScore: 20,
				},
				{
					id: 'assessment-2',
					classGroupId,
					classSubjectId: 'cs-math',
					periodId,
					title: 'Quiz 2',
					kind: 'quiz',
					maxScore: 20,
				},
			]),
			listEnvelope([{
				id: 'cs-math',
				schoolId: SEED_SCHOOL_ID,
				classGroupId,
				subjectId: 'subj-math',
			}]),
			listEnvelope(enrollments),
			listEnvelope(results),
			listEnvelope([{ id: 'subj-math', schoolId: SEED_SCHOOL_ID, name: 'Mathematics' }]),
		]);

		const sources = await fetchClassAssessmentsSources(client, classGroupId, periodId);

		expect(sources.resultsRaw).toHaveLength(60);
		expect(entityListRequests(requests, 'assessment-results')[0]?.body).toEqual(paged({
			assessmentId: { $in: ['assessment-1', 'assessment-2'] },
			studentId: { $in: studentIds },
		}));
		expect(entityListRequests(requests, 'assessment-results')[0]?.body).toMatchObject({
			$limit: CATALOG_LIST_PAGE_SIZE,
			$offset: 0,
		});
	});
});

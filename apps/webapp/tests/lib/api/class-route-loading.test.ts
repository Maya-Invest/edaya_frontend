import { fetchClassAssessmentsSources, loadAssessmentForEdit, loadClassEvaluationsPageData } from '$lib/api/assessments-data';
import { CATALOG_LIST_PAGE_SIZE } from '$lib/api/entity-list-filters';
import { fetchClassHomeworkSources } from '$lib/api/homework-data';
import { defaultPlanningDateRange, fetchClassPlanningSources } from '$lib/api/planning-data';
import { fetchClassSubjectsSources } from '$lib/api/subjects-data';
import { fetchClassTeachingLogSources } from '$lib/api/teaching-log-data';
import { createRecordingSchoolClient, entityListRequests, queryRequests } from '$tests/support/recording-school-client';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';

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
			listEnvelope([]),
		]);

		await fetchClassSubjectsSources(client, classGroupId);

		expect(entityListRequests(requests, 'class-subjects')[0]?.body).toEqual(paged({ classGroupId }));
		expect(entityListRequests(requests, 'subjects')[0]?.body).toEqual(paged({
			id: { $in: ['subj-math'] },
		}));
	});

	it('loads assessment setup from a bounded query without requesting marks or students', async () => {
		const { client, requests } = createRecordingSchoolClient([{ assessmentsRaw: [], classSubjectsRaw: [], subjectsRaw: [], classSize: 30, markResults: [] }]);
		const sources = await fetchClassAssessmentsSources(client, classGroupId, periodId);
		expect(sources.classSize).toBe(30);
		expect(sources.resultsRaw).toEqual([]);
		expect(requests).toHaveLength(1);
		expect(requests[0]?.path).toContain('get-assessment-editor-context');
		expect(requests[0]?.body).toEqual({ classGroupId, periodId });
	});

	it('keeps real list progress and distinguishes unavailable results from authorized zero progress', async () => {
		const assessment = (id: string, kind = 'quiz') => ({ id, classGroupId, classSubjectId: 'cs-math', periodId, title: id, kind, maxScore: 20, startsAt: '2026-06-10', coefficient: 1 });
		const { client, requests } = createRecordingSchoolClient([{
			assessmentsRaw: [assessment('marked'), assessment('homework', 'homework'), assessment('empty'), assessment('hidden')],
			classSubjectsRaw: [],
			subjectsRaw: [],
			classSize: 2,
			markResults: [
				{ assessmentId: 'marked', results: [{ id: 'r1', assessmentId: 'marked', studentId: 's1', score: 18 }, { id: 'r2', assessmentId: 'marked', studentId: 's2', score: 14 }] },
				{ assessmentId: 'homework', results: [{ id: 'h1', assessmentId: 'homework', studentId: 's1', status: 'met' }] },
				{ assessmentId: 'empty', results: [] },
			],
		}]);
		const { evaluations } = await loadClassEvaluationsPageData(client, classGroupId, periodId);
		expect(evaluations.find(row => row.id === 'marked')).toMatchObject({ marksAvailable: true, graded: 2, total: 2, averageMark: 16 });
		expect(evaluations.find(row => row.id === 'homework')).toMatchObject({ marksAvailable: true, submittedCount: 1, total: 2 });
		expect(evaluations.find(row => row.id === 'empty')).toMatchObject({ marksAvailable: true, graded: 0 });
		expect(evaluations.find(row => row.id === 'hidden')).toMatchObject({ marksAvailable: false });
		expect(requests).toHaveLength(1);
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
		const results = ['assessment-1', 'assessment-2'].flatMap(assessmentId =>
			studentIds.map(studentId => ({
				id: `${assessmentId}:${studentId}`,
				assessmentId,
				studentId,
				score: 12,
			})),
		);

		const { client, requests } = createRecordingSchoolClient([
			{ assessmentsRaw: [{ id: 'assessment-1', classGroupId, classSubjectId: 'cs-math', periodId }, { id: 'assessment-2', classGroupId, classSubjectId: 'cs-math', periodId }], classSubjectsRaw: [], subjectsRaw: [], classSize: 30, markResults: [] },
			listEnvelope(studentIds.map((studentId, index) => ({ id: `enrollment-${index + 1}`, schoolId: SEED_SCHOOL_ID, studentId, classGroupId, status: 'active' }))),
			listEnvelope(results),
		]);
		const sources = await fetchClassAssessmentsSources(client, classGroupId, periodId, true);

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

it('reloads editable assessments through the bounded context without a general entity read', async () => {
	const row = { id: 'assessment-edit', classGroupId, classSubjectId: 'math', periodId, title: 'Fresh server title' };
	const response = { assessmentsRaw: [row], classSubjectsRaw: [], subjectsRaw: [], classSize: 2, markResults: [] };
	const { client, requests } = createRecordingSchoolClient([response, response]);
	expect(await loadAssessmentForEdit(client, classGroupId, periodId, row.id)).toMatchObject(row);
	await expect(loadAssessmentForEdit(client, classGroupId, periodId, 'unrelated')).rejects.toThrow('ASSESSMENT_NOT_AVAILABLE');
	expect(requests.every(request => request.path.includes('get-assessment-editor-context'))).toBe(true);
});

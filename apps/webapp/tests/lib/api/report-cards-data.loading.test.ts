import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { CATALOG_LIST_PAGE_SIZE } from '$lib/api/entity-list-filters';
import {
	loadClassReportCardResultsData,
	loadGradeScalesCatalogData,
	loadStudentYearReportCardsData,
} from '$lib/api/report-cards-data';
import { createRecordingSchoolClient, entityListRequests } from '$tests/support/recording-school-client';

const classGroupId = 'class-6a';
const periodId = 'period-1';

function paged(body: Record<string, unknown>) {
	return {
		...body,
		$limit: CATALOG_LIST_PAGE_SIZE,
		$offset: 0,
	};
}

function listEnvelope<T>(items: readonly T[]) {
	return items.map(item => ({ data: item }));
}

describe('report-card data loading', () => {
	it('lists grade scales for the current school without loading subjects', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'scale-1',
				schoolId: SEED_SCHOOL_ID,
				name: 'Scale 20',
				minScore: 0,
				maxScore: 20,
				decimalPlaces: 1,
				isDefault: true,
				ranges: [],
			}]),
		]);

		const scales = await loadGradeScalesCatalogData(client, SEED_SCHOOL_ID);

		expect(scales.map(scale => scale.id)).toEqual(['scale-1']);
		expect(entityListRequests(requests, 'grade-scales')[0]?.body).toEqual(paged({
			schoolId: SEED_SCHOOL_ID,
		}));
		expect(entityListRequests(requests, 'subjects')).toHaveLength(0);
		expect(entityListRequests(requests, 'definitions')).toHaveLength(0);
	});

	it('loads report-card results only for the selected class and period', async () => {
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'result-1',
				gradeLevelId: 'grade', academicYearId: 'year', reportConfigurationRevision: 1,
				studentId: 'student-1',
				classGroupId,
				periodId,
				sectionResults: [],
				attendanceSummary: {},
				assessmentResultCount: 0,
				status: 'draft',
				generatedAt: '2026-06-01',
			}]),
			listEnvelope([]),
		]);

		const results = await loadClassReportCardResultsData(
			client,
			classGroupId,
			periodId,
		);

		expect(results.map(result => result.id)).toEqual(['result-1']);
		expect(entityListRequests(requests, 'results')[0]?.body).toEqual(paged({
			classGroupId,
			periodId,
		}));
		expect(entityListRequests(requests, 'class-subjects')[0]?.body).toEqual(paged({ classGroupId }));
	});
});

it('loads student-year results across placement classes and filters stale scope rows', async () => {
 const row = { id: 'r', studentId: 'student', academicYearId: 'year', periodId: 'term', classGroupId: 'previous-class', status: 'published', sectionResults: [], gradeLevelId: 'level', reportConfigurationRevision: 1 };
 const { client, requests } = createRecordingSchoolClient([listEnvelope([row, { ...row, id: 'annual', periodId: 'annual', classGroupId: 'current-class', aggregation: { source: 'report_cards', sourcePeriodIds: ['term'] } }, { ...row, id: 'other-student', studentId: 'other' }, { ...row, id: 'other-year', academicYearId: 'old-year' }]), [], []]);
 const data = await loadStudentYearReportCardsData(client, 'student', 'year', ['term', 'annual']);
 expect(data.results.map(result => result.id)).toEqual(['r', 'annual']);
 expect(data.raw.map(result => result.id)).toEqual(['r', 'annual']);
 expect(entityListRequests(requests, 'results')[0]?.body).toMatchObject({ studentId: 'student', periodId: { $in: ['term', 'annual'] } });
 expect(entityListRequests(requests, 'class-subjects').map(request => (request.body as Record<string, unknown>).classGroupId)).toEqual(['previous-class', 'current-class']);
});

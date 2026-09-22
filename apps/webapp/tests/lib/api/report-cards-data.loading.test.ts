import type { ReportCardDefinition } from '$lib/types/report-cards';
import { SEED_SCHOOL_ID } from '@edaya/web-fixtures';
import { describe, expect, it } from 'bun:test';
import { CATALOG_LIST_PAGE_SIZE } from '$lib/api/entity-list-filters';
import {
	loadClassReportCardResultsData,
	loadGradeScalesCatalogData,
	loadReportCardCatalogData,
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
	it('keeps the small catalog explicit and scopes sections to returned definitions', async () => {
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
			listEnvelope([{
				id: 'definition-1',
				schoolId: SEED_SCHOOL_ID,
				name: 'Term report',
				academicYearId: 'year-1',
				gradeLevelId: 'grade-6',
				gradeScaleId: 'scale-1',
				status: 'published',
			}]),
			listEnvelope([]),
			listEnvelope([]),
		]);

		await loadReportCardCatalogData(client, SEED_SCHOOL_ID);

		expect(entityListRequests(requests, 'grade-scales')[0]?.body).toEqual(paged({
			schoolId: SEED_SCHOOL_ID,
		}));
		expect(entityListRequests(requests, 'definitions')[0]?.body).toEqual(paged({
			schoolId: SEED_SCHOOL_ID,
		}));
		expect(entityListRequests(requests, 'subjects')[0]?.body).toEqual(paged({
			schoolId: SEED_SCHOOL_ID,
		}));
		expect(entityListRequests(requests, 'sections')[0]?.body).toEqual(paged({
			reportCardDefinitionId: { $in: ['definition-1'] },
		}));
		expect(entityListRequests(requests, 'results')).toHaveLength(0);
	});

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
		const definition: ReportCardDefinition = {
			id: 'definition-1',
			schoolId: SEED_SCHOOL_ID,
			name: 'Term report',
			academicYearId: 'year-1',
			gradeLevelId: 'grade-6',
			gradeScaleId: 'scale-1',
			status: 'published',
			sections: [],
		};
		const { client, requests } = createRecordingSchoolClient([
			listEnvelope([{
				id: 'result-1',
				reportCardDefinitionId: definition.id,
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
			[definition],
		);

		expect(results.map(result => result.id)).toEqual(['result-1']);
		expect(entityListRequests(requests, 'results')[0]?.body).toEqual(paged({
			classGroupId,
			periodId,
		}));
		expect(entityListRequests(requests, 'class-subjects')[0]?.body).toEqual(paged({ classGroupId }));
	});
});

import type { AnnualReportResult } from '$lib/api/annual-report-cards-data';
import type { ReportCardDefinition } from '$lib/types/report-cards';
import type { StudentDetailHost } from '../lib/student-detail-host';
import { academicContext } from '$lib/academic/context.svelte';
import { loadStudentYearReportResults } from '$lib/api/annual-report-cards-data';
import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
import { loadReportCardCatalogData } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { nowIso } from '$lib/date/format';
import { lang, t } from '$lib/i18n';
import { hasAnyPermission } from '$lib/permissions';
import { get } from 'svelte/store';
import { runStudentRouteMutation } from '../lib/student-route-mutation';

export interface AnnualReportSelection {
	studentId: string;
	targetId: string;
	definitionId: string;
	sourceIds: string[];
	weights: Record<string, number>;
}

export class AnnualReportCardState {
	results = $state<AnnualReportResult[]>([]);
	definitions = $state<ReportCardDefinition[]>([]);
	studentId = $state('');
	constructor(private readonly getPage: () => StudentDetailHost) {}
	clear() {
		this.results = [];
		this.definitions = [];
		this.studentId = '';
	}

	canAccess(studentId: string) {
		return hasAnyPermission(['REPORT_CARD_GENERATE', 'REPORT_CARD_PUBLISH'], { classId: this.getPage().findStudent(studentId)?.classId });
	}

	get periods() {
		return academicContext.periods.filter(period => period.academicYearId === academicContext.yearId)
			.toSorted((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
	}

	definitionsFor(studentId: string) {
		const student = this.getPage().findStudent(studentId);
		const cls = academicContext.classes.find(entry => entry.id === student?.classId);
		return this.definitions.filter(entry => entry.academicYearId === academicContext.yearId && entry.gradeLevelId === cls?.gradeLevelId && entry.status === 'published');
	}

	async refresh(studentId: string, signal?: AbortSignal) {
		if (!this.canAccess(studentId)) {
			this.clear();
			return;
		}
		const client = getBrowserSchoolClient();
		const schoolId = authSession.schoolId ?? '';
		const [results, catalog] = await Promise.all([
			loadStudentYearReportResults(client, studentId, this.periods.map(period => period.id)),
			loadReportCardCatalogData(client, schoolId),
		]);
		signal?.throwIfAborted();
		this.studentId = studentId;
		this.results = results;
		this.definitions = catalog.definitions;
	}

	async generate(selection: AnnualReportSelection) {
		const response = await runStudentRouteMutation({
			request: () => getBrowserSchoolClient().commands.generateReportCardResult({
				id: crypto.randomUUID(),
				studentId: selection.studentId,
				periodId: selection.targetId,
				reportCardDefinitionId: selection.definitionId,
				generatedAt: nowIso(),
				aggregation: { source: 'report_cards', sourcePeriodIds: selection.sourceIds, periodWeightsByPeriodId: selection.weights },
			}),
			versionKeys: ['reportCards', 'students'],
			successMessage: get(t)('reportCards.annual.generated'),
			onSuccess: () => this.refresh(selection.studentId),
		});
		return response !== null;
	}

	async publish(result: AnnualReportResult) {
		const response = await runStudentRouteMutation({
			request: () => getBrowserSchoolClient().commands.publishReportCardResult({
				id: result.id,
				studentId: result.studentId,
				periodId: result.periodId,
				reportCardDefinitionId: result.reportCardDefinitionId,
				publishedAt: nowIso(),
			}),
			versionKeys: ['reportCards', 'students', 'documents'],
			successMessage: get(t)('reportCards.annual.published'),
			onSuccess: () => this.refresh(result.studentId),
		});
		return response !== null;
	}

	async issue(result: AnnualReportResult) {
		const response = await requestDocumentIssuanceMutation({
			templateKey: 'annual-report-card.v1',
			sourceId: result.id,
			studentId: result.studentId,
			classGroupId: result.classGroupId,
			academicYearId: academicContext.yearId,
			locale: get(lang),
			successMessage: get(t)('documents.toastRequested'),
		});
		return response !== null && response.status !== 'failed';
	}
}

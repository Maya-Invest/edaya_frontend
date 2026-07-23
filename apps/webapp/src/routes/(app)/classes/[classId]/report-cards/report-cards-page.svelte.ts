import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { GradeScale, ReportCardDefinition, ReportCardResult } from '$lib/types/report-cards';
import type { Student } from '$lib/types/school';
import type { ReportCardsPageSlice } from './lib/report-cards-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { openReportCardPdf } from '$lib/api/report-card-pdf';
import { loadClassReportCardResultsData } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { nowIso } from '$lib/date/format';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import {
	emptyReportCardsSlice,
	reportCardDetailIdFromUrl,
	reportCardsClassIdFromUrl,
	reportCardsPeriodIdFromUrl,
} from './lib/report-cards-helpers';
import { loadReportCardsSlice, queryReportCardsListPage } from './lib/report-cards-queries';
import { runReportCardsRouteMutation } from './lib/report-cards-route-mutation';

const REPORT_CARDS_VERSION_FAMILIES = ['reportCards', 'students'] as const satisfies readonly EntityVersionKey[];

const REPORT_CARDS_PAGE_STATE_KEY = Symbol('report-cards-page-state');

export type { ReportCardsPageSlice };

export class ReportCardsPageState {
	slice = $state<ReportCardsPageSlice | null>(null);

	private readonly versions = new RouteVersionSnapshot(REPORT_CARDS_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {}

	applySlice(classId: string, data: Partial<Omit<ReportCardsPageSlice, 'classId'>>) {
		this.slice = { ...emptyReportCardsSlice(classId), ...data, classId };
		this.versions.markLoaded();
	}

	seed(classId: string, data: Partial<Omit<ReportCardsPageSlice, 'classId'>>) {
		if (this.slice?.classId === classId) {
			return;
		}
		this.applySlice(classId, data);
	}

	clear() {
		this.slice = null;
	}

	get selectedId() {
		return reportCardDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		const classId = reportCardsClassIdFromUrl(this.getUrl());
		if (!classId) {
			return undefined;
		}
		return this.selectedResult(classId, this.selectedId);
	}

	get periodId() {
		return reportCardsPeriodIdFromUrl(this.getUrl());
	}

	studentsFor(classId: string): Student[] {
		return this.slice?.classId === classId ? this.slice.students : [];
	}

	resultsFor(classId: string): ReportCardResult[] {
		return this.slice?.classId === classId ? this.slice.results : [];
	}

	scalesFor(classId: string): GradeScale[] {
		return this.slice?.classId === classId ? this.slice.scales : [];
	}

	definitionsFor(classId: string): ReportCardDefinition[] {
		return this.slice?.classId === classId ? this.slice.definitions : [];
	}

	studentFor(studentId: string): Student | undefined {
		return this.slice?.students.find(student => student.id === studentId);
	}

	resultForStudent(studentId: string): ReportCardResult | undefined {
		return this.slice?.results.find(result => result.studentId === studentId);
	}

	selectedResult(classId: string, resultId?: string) {
		if (!resultId || this.slice?.classId !== classId) {
			return undefined;
		}
		return this.slice.results.find(result => result.id === resultId);
	}

	patchResult(id: string, patch: Partial<ReportCardResult>) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			results: this.slice.results.map(result =>
				result.id === id ? { ...result, ...patch } : result,
			),
		};
	}

	replaceResults(results: ReportCardResult[]) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			results,
		};
	}

	queryListPage(classId: string) {
		return queryReportCardsListPage(classId, this);
	}

	async refreshSlice(classId: string) {
		const data = await loadReportCardsSlice(classId, this.periodId);
		this.applySlice(classId, data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		const classId = this.slice?.classId ?? reportCardsClassIdFromUrl(this.getUrl());
		if (!classId) {
			return;
		}
		await this.refreshSlice(classId);
	}

	private resolveDefinitionId(studentId: string): string | undefined {
		const student = this.studentFor(studentId);
		if (!student || !this.slice) {
			return undefined;
		}

		const cls = academicContext.classes.find(entry => entry.id === student.classId);
		if (!cls) {
			return undefined;
		}

		const definition = this.slice.definitions.find(
			entry =>
				entry.gradeLevelId === cls.gradeLevelId
				&& entry.academicYearId === academicContext.yearId
				&& entry.status === 'published',
		) ?? this.slice.definitions.find(
			entry => entry.gradeLevelId === cls.gradeLevelId && entry.status === 'published',
		);

		return definition?.id;
	}

	private async refreshResults(classId: string) {
		const periodId = this.periodId;
		if (!periodId || !this.slice) {
			return;
		}
		const client = getBrowserSchoolClient();
		const results = await loadClassReportCardResultsData(
			client,
			classId,
			periodId,
			this.slice.definitions,
		);
		this.replaceResults(results);
	}

	private async generateReportCardResultCommand(studentId: string, periodId: string): Promise<boolean> {
		const definitionId = this.resolveDefinitionId(studentId);
		if (!definitionId) {
			return false;
		}

		const existing = this.slice?.results.find(
			result => result.studentId === studentId && result.academicPeriodId === periodId,
		);
		const client = getBrowserSchoolClient();
		await client.commands.generateReportCardResult({
			id: existing?.id ?? `rcr-${studentId}-${periodId}`,
			studentId,
			periodId,
			reportCardDefinitionId: definitionId,
			generatedAt: nowIso(),
		});
		return true;
	}

	async generateForStudent(input: {
		studentId: string;
		successMessage?: string;
	}): Promise<boolean> {
		const periodId = this.periodId;
		const classId = this.slice?.classId;
		if (!periodId || !classId) {
			return false;
		}

		const result = await runReportCardsRouteMutation({
			request: async () => {
				if (!await this.generateReportCardResultCommand(input.studentId, periodId)) {
					throw new Error('Aucun modèle de bulletin publié pour cette classe.');
				}
				return true;
			},
			successMessage: input.successMessage,
			versionKeys: ['reportCards'],
			onSuccess: () => this.refreshResults(classId),
		});
		return result !== null;
	}

	async generateForClass(input: {
		classId: string;
		successMessage?: string;
	}): Promise<number | null> {
		const periodId = this.periodId;
		if (!periodId || this.slice?.classId !== input.classId) {
			return null;
		}

		const students = this.slice.students.filter((student) => {
			const existing = this.slice?.results.find(
				result => result.studentId === student.id && result.academicPeriodId === periodId,
			);
			return existing?.status !== 'published';
		});
		if (students.length === 0) {
			return 0;
		}

		return runReportCardsRouteMutation({
			request: async () => {
				let count = 0;
				for (const student of students) {
					if (await this.generateReportCardResultCommand(student.id, periodId)) {
						count += 1;
					}
				}
				return count;
			},
			successMessage: input.successMessage,
			versionKeys: ['reportCards'],
			onSuccess: () => this.refreshResults(input.classId),
		});
	}

	async publishResult(input: {
		resultId: string;
		successMessage?: string;
	}): Promise<boolean> {
		const periodId = this.periodId;
		const existing = this.slice?.results.find(result => result.id === input.resultId);
		if (!periodId || !existing || !this.slice) {
			return false;
		}

		const client = getBrowserSchoolClient();
		const result = await runReportCardsRouteMutation({
			request: () => client.commands.publishReportCardResult({
				id: existing.id,
				studentId: existing.studentId,
				periodId,
				reportCardDefinitionId: existing.definitionId,
				publishedAt: nowIso(),
			}),
			successMessage: input.successMessage,
			versionKeys: ['reportCards'],
			onSuccess: () => this.refreshResults(this.slice!.classId),
		});
		return result !== null;
	}

	async downloadPdf(resultId: string): Promise<'ready' | 'pending' | 'missing' | 'error'> {
		try {
			const lookup = await openReportCardPdf(resultId);
			return lookup.status === 'ready' ? 'ready' : lookup.status;
		}
		catch {
			return 'error';
		}
	}
}

export function setReportCardsPageState(state: ReportCardsPageState) {
	setContext(REPORT_CARDS_PAGE_STATE_KEY, state);
}

export function getReportCardsPageState() {
	return getContext<ReportCardsPageState>(REPORT_CARDS_PAGE_STATE_KEY);
}

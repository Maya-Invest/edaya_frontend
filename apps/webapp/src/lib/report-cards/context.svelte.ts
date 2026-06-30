import type { GradeScale, ReportCardDefinition, ReportCardResult } from '$lib/types/report-cards';
import { academicContext } from '$lib/academic/context.svelte';
import { seedClassPeriodReportCardResults } from './seed-policies';

function clone<T>(value: T): T {
	return structuredClone(value);
}

export class ReportCardsContext {
	scales = $state<GradeScale[]>([]);
	definitions = $state<ReportCardDefinition[]>([]);
	results = $state<ReportCardResult[]>([]);
	ready = $state(false);

	resultsForClass(classId: string, periodId = academicContext.periodId) {
		return this.results.filter(
			r => r.classId === classId && r.academicPeriodId === periodId,
		);
	}

	resultsForStudent(studentId: string) {
		return this.results.filter(r => r.studentId === studentId);
	}

	hydrateCatalog(input: {
		gradeScales: GradeScale[];
		reportCardDefinitions: ReportCardDefinition[];
	}) {
		this.scales = clone(input.gradeScales);
		this.definitions = clone(input.reportCardDefinitions);
		this.ready = true;
	}

	seedClassPeriodResults(
		results: ReportCardResult[],
		scope: { classId: string; periodId: string },
	) {
		this.results = clone(seedClassPeriodReportCardResults(this.results, results, scope));
	}

	reset() {
		this.scales = [];
		this.definitions = [];
		this.results = [];
		this.ready = false;
	}
}

export const reportCardsContext = new ReportCardsContext();

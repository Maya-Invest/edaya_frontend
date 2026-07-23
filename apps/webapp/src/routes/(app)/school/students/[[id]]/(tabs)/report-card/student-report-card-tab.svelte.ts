import type { GradeScale, ReportCardDefinition, ReportCardResult } from '$lib/types/report-cards';
import type { StudentsPageState } from '../../../students-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { openReportCardPdf } from '$lib/api/report-card-pdf';
import { loadClassReportCardResultsData, loadReportCardCatalogData } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { studentDetailIdFromPathname } from '$lib/api/student-detail-url';
import { nowIso } from '$lib/date/format';
import { getContext, setContext } from 'svelte';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { runStudentRouteMutation } from '../../../lib/student-route-mutation';

const STUDENT_REPORT_CARD_TAB_KEY = Symbol('student-report-card-tab');

export interface StudentReportCardTabSlice {
	studentId: string;
	reportCardResults: ReportCardResult[];
	gradeScales: GradeScale[];
	reportCardDefinitions: ReportCardDefinition[];
}

export type StudentReportCardTabSeed = Partial<Omit<StudentReportCardTabSlice, 'studentId'>>;

function emptySlice(studentId: string): StudentReportCardTabSlice {
	return {
		studentId,
		reportCardResults: [],
		gradeScales: [],
		reportCardDefinitions: [],
	};
}

function resolveReportCardDefinitionId(
	slice: StudentReportCardTabSlice,
	studentClassId: string,
): string | undefined {
	const cls = academicContext.classes.find(entry => entry.id === studentClassId);
	if (!cls) {
		return undefined;
	}

	const definition = slice.reportCardDefinitions.find(
		entry =>
			entry.gradeLevelId === cls.gradeLevelId
			&& entry.academicYearId === academicContext.yearId
			&& entry.status === 'published',
	) ?? slice.reportCardDefinitions.find(
		entry => entry.gradeLevelId === cls.gradeLevelId && entry.status === 'published',
	);

	return definition?.id;
}

export class StudentReportCardTabState {
	slice = $state<StudentReportCardTabSlice | null>(null);

	constructor(private readonly getPage: () => StudentsPageState) {}

	clear() {
		this.slice = null;
	}

	seed(studentId: string, data: StudentReportCardTabSeed) {
		if (!this.slice || this.slice.studentId !== studentId) {
			this.slice = { ...emptySlice(studentId), ...data, studentId };
			return;
		}
		this.slice = { ...this.slice, ...data, studentId };
	}

	private forStudent(studentId: string) {
		return this.slice?.studentId === studentId ? this.slice : null;
	}

	reportCardResultsFor(studentId: string) {
		return this.forStudent(studentId)?.reportCardResults ?? [];
	}

	reportCardScalesFor(studentId: string) {
		return this.forStudent(studentId)?.gradeScales ?? [];
	}

	async loadCatalog(studentId: string) {
		const catalog = await loadReportCardCatalogData(getBrowserSchoolClient());
		this.seed(studentId, {
			gradeScales: catalog.gradeScales,
			reportCardDefinitions: catalog.definitions,
		});
	}

	async refreshResults(studentId: string) {
		const page = this.getPage();
		const student = page.findStudent(studentId);
		const slice = this.forStudent(studentId);
		if (!student || !slice) {
			return;
		}

		const results = await loadClassReportCardResultsData(
			getBrowserSchoolClient(),
			student.classId,
			academicContext.periodId,
			slice.reportCardDefinitions,
		);
		this.seed(studentId, {
			reportCardResults: results.filter(result => result.studentId === studentId),
		});
	}

	query() {
		return (url: URL) => resolveStudentPageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const studentId = studentDetailIdFromPathname(url.pathname);
				const page = this.getPage();
				const student = studentId ? page.findStudent(studentId) : undefined;
				if (!studentId || !student) {
					return {};
				}

				await this.loadCatalog(studentId);
				await this.refreshResults(studentId);
				return {};
			},
			hasItems: () => true,
		});
	}

	async generateReportCard(studentId: string): Promise<boolean> {
		const page = this.getPage();
		const student = page.findStudent(studentId);
		const slice = this.forStudent(studentId);
		const periodId = academicContext.periodId;
		const definitionId = slice && student
			? resolveReportCardDefinitionId(slice, student.classId)
			: undefined;
		if (!definitionId) {
			return false;
		}

		const client = getBrowserSchoolClient();
		const id = `rcr-${studentId}-${periodId}`;

		const result = await runStudentRouteMutation({
			request: async () => {
				await client.commands.generateReportCardResult({
					id,
					studentId,
					periodId,
					reportCardDefinitionId: definitionId,
					generatedAt: nowIso(),
				});
				return true;
			},
			errorMessage: 'Impossible de générer le bulletin.',
			versionKeys: ['students', 'reportCards'],
			onSuccess: async () => {
				await this.refreshResults(studentId);
			},
		});
		return result !== null;
	}

	async publishReportCard(input: {
		resultId: string;
		studentId: string;
		periodId: string;
		definitionId?: string;
	}): Promise<boolean> {
		const client = getBrowserSchoolClient();
		const existing = this.forStudent(input.studentId)?.reportCardResults.find(r => r.id === input.resultId);
		const resolvedDefinitionId = input.definitionId ?? existing?.definitionId;

		const result = await runStudentRouteMutation({
			request: () => client.commands.publishReportCardResult({
				id: input.resultId,
				studentId: input.studentId,
				periodId: input.periodId,
				reportCardDefinitionId: resolvedDefinitionId,
				publishedAt: nowIso(),
			}),
			versionKeys: ['students', 'reportCards'],
			onSuccess: async () => {
				await this.refreshResults(input.studentId);
			},
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

export function setStudentReportCardTabState(state: StudentReportCardTabState) {
	setContext(STUDENT_REPORT_CARD_TAB_KEY, state);
}

export function getStudentReportCardTabState() {
	return getContext<StudentReportCardTabState>(STUDENT_REPORT_CARD_TAB_KEY);
}

import type {
	DocumentIssuance,
	DocumentStaffFields,
	DocumentTemplateCatalogItem,
	DocumentTemplateKey,
} from '$lib/api/documents-types';
import type { StudentEnrollmentHistoryItem } from '$lib/types/school';
import type { StudentsPageState } from '../../../students-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadDocumentIssuances, loadDocumentTemplates, studentYearAccountSourceId } from '$lib/api/documents-data';
import { CONVOCATION_TEMPLATE, STUDENT_GENERATE_TEMPLATE_KEYS } from '$lib/api/documents-types';
import { loadStudentFinanceSummary } from '$lib/api/finance-data';
import { DEFAULT_CATALOG_CURRENCY } from '$lib/api/finance-types';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { studentDetailIdFromPathname } from '$lib/api/student-detail-url';
import { loadStudentEnrollmentHistory } from '$lib/api/student-drawer-data';
import { authSession } from '$lib/auth/session.svelte';
import { entityVersions } from '$lib/entity-versions.svelte';
import { getContext, setContext } from 'svelte';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';

const STUDENT_DOCUMENTS_TAB_KEY = Symbol('student-documents-tab');

export interface StudentDocumentsTabSlice {
	studentId: string;
	issuances: DocumentIssuance[];
	templates: DocumentTemplateCatalogItem[];
	enrollments: StudentEnrollmentHistoryItem[];
	currency: string;
}

export type StudentDocumentsTabSeed = Partial<Omit<StudentDocumentsTabSlice, 'studentId'>>;

function emptySlice(studentId: string): StudentDocumentsTabSlice {
	return { studentId, issuances: [], templates: [], enrollments: [], currency: DEFAULT_CATALOG_CURRENCY };
}

export class StudentDocumentsTabState {
	slice = $state<StudentDocumentsTabSlice | null>(null);
	documentsVersion = $state(entityVersions.documents);

	constructor(private readonly getPage: () => StudentsPageState) {}

	clear() {
		this.slice = null;
	}

	seed(studentId: string, data: StudentDocumentsTabSeed) {
		if (!this.slice || this.slice.studentId !== studentId) {
			this.slice = { ...emptySlice(studentId), ...data, studentId };
			return;
		}
		this.slice = { ...this.slice, ...data, studentId };
	}

	private forStudent(studentId: string) {
		return this.slice?.studentId === studentId ? this.slice : null;
	}

	issuancesFor(studentId: string) {
		return this.forStudent(studentId)?.issuances ?? [];
	}

	templatesFor(studentId: string) {
		return this.forStudent(studentId)?.templates ?? [];
	}

	enrollmentsFor(studentId: string) {
		return this.forStudent(studentId)?.enrollments ?? [];
	}

	currencyFor(studentId: string) {
		return this.forStudent(studentId)?.currency ?? DEFAULT_CATALOG_CURRENCY;
	}

	generateTemplatesFor(studentId: string) {
		return this.templatesFor(studentId).filter(template =>
			STUDENT_GENERATE_TEMPLATE_KEYS.includes(template.templateKey),
		);
	}

	resolveSourceId(studentId: string, templateKey: DocumentTemplateKey): string | null {
		const student = this.getPage().findStudent(studentId);
		const enrollments = this.enrollmentsFor(studentId);
		const active = enrollments.find(entry => entry.status === 'active') ?? enrollments[0];
		const withdrawn = enrollments.find(entry => entry.status === 'closed' && entry.endReason === 'withdrawn');
		const schoolId = authSession.schoolId ?? '';
		const yearId = academicContext.yearId;
		switch (templateKey) {
			case 'schooling-certificate.v1':
			case 'enrollment-record.v1':
				return student?.enrollmentId || active?.id || null;
			case 'withdrawal-certificate.v1':
				return withdrawn?.id || null;
			case 'invoice.v1':
			case 'account-statement.v1':
			case 'payment-reminder.v1':
				if (!schoolId || !yearId) {
					return null;
				}
				return studentYearAccountSourceId({
					schoolId,
					studentId,
					academicYearId: yearId,
					currency: this.currencyFor(studentId),
				});
			case 'student-id-card.v1':
			case CONVOCATION_TEMPLATE:
				return studentId;
			case 'annual-transcript.v1':
			case 'report-card.v1':
			case 'receipt.v1':
			case 'settlement-quittance.v1':
			case 'logbook.v1':
			case 'class-timetable.v1':
			case 'teacher-timetable.v1':
			case 'class-roster.v1':
			case 'attendance-sheet.v1':
			case 'incident-report.v1':
				return student?.enrollmentId || studentId;
			default:
				return studentId;
		}
	}

	query() {
		return (url: URL) => resolveStudentPageLoad(url, {
			empty: () => ({}),
			load: async () => {
				this.documentsVersion = entityVersions.documents;
				const studentId = studentDetailIdFromPathname(url.pathname);
				const academicYearId = academicContext.yearId;
				if (!studentId || !academicYearId) {
					return {};
				}
				const client = getBrowserSchoolClient();
				const [issuances, templates, enrollments, summary] = await Promise.all([
					loadDocumentIssuances(client, { studentId, academicYearId }),
					loadDocumentTemplates(client),
					loadStudentEnrollmentHistory(client, studentId),
					loadStudentFinanceSummary(client, { studentId, academicYearId }),
				]);
				this.seed(studentId, {
					issuances,
					templates,
					enrollments,
					currency: summary?.currency || DEFAULT_CATALOG_CURRENCY,
				});
				return {};
			},
			hasItems: () => true,
		});
	}
}

export function setStudentDocumentsTabState(state: StudentDocumentsTabState) {
	setContext(STUDENT_DOCUMENTS_TAB_KEY, state);
}

export function getStudentDocumentsTabState() {
	return getContext<StudentDocumentsTabState>(STUDENT_DOCUMENTS_TAB_KEY);
}

export type { DocumentStaffFields };

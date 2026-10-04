import type {
	DocumentIssuance,
	DocumentStaffFields,
	DocumentTemplateCatalogItem,
	DocumentTemplateKey,
} from '$lib/api/documents-types';
import type { StudentEnrollmentHistoryItem } from '$lib/types/school';
import type { StudentDetailHost } from '../../../lib/student-detail-host';
import type { PageQueryRequest } from '../../../lib/student-page-status';
import { academicContext } from '$lib/academic/context.svelte';
import { loadDocumentIssuances, loadDocumentTemplates, studentYearAccountSourceId } from '$lib/api/documents-data';
import { CONVOCATION_TEMPLATE, STUDENT_GENERATE_TEMPLATE_KEYS } from '$lib/api/documents-types';
import { loadStudentFinanceSummary } from '$lib/api/finance-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { studentDetailIdFromPathname } from '$lib/api/student-detail-url';
import { loadStudentEnrollmentHistory } from '$lib/api/student-drawer-data';
import { authSession } from '$lib/auth/session.svelte';
import { entityVersions } from '$lib/entity-versions.svelte';
import { getContext, setContext } from 'svelte';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { AnnualReportCardState } from '../../annual-report-card-state.svelte';

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
	return { studentId, issuances: [], templates: [], enrollments: [], currency: '' };
}

export class StudentDocumentsTabState {
	slice = $state<StudentDocumentsTabSlice | null>(null);
	documentsVersion = $state(entityVersions.documents);

	constructor(private readonly getPage: () => StudentDetailHost, readonly annual = new AnnualReportCardState(getPage)) {}

	clear() {
		this.annual.clear();
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
		return this.forStudent(studentId)?.currency ?? '';
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
				if (!schoolId || !yearId || !this.currencyFor(studentId)) {
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
			case 'annual-report-card.v1':
				return null; // Annual selection owns the validated report result ID.
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
		return (url: URL, request?: PageQueryRequest) => resolveStudentPageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
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
				signal.throwIfAborted();
				this.seed(studentId, {
					issuances,
					templates,
					enrollments,
					currency: summary?.currency ?? '',
				});
				await this.annual.refresh(studentId, signal);
				return {};
			},
			hasItems: () => true,
		}, request);
	}
}

export function setStudentDocumentsTabState(state: StudentDocumentsTabState) {
	setContext(STUDENT_DOCUMENTS_TAB_KEY, state);
}

export function getStudentDocumentsTabState() {
	return getContext<StudentDocumentsTabState>(STUDENT_DOCUMENTS_TAB_KEY);
}

export type { DocumentStaffFields };

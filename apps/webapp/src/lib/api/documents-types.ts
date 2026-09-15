export type DocumentTemplateKey
	= | 'report-card.v1'
		| 'logbook.v1'
		| 'schooling-certificate.v1'
		| 'enrollment-record.v1'
		| 'student-id-card.v1'
		| 'invoice.v1'
		| 'receipt.v1'
		| 'settlement-quittance.v1'
		| 'account-statement.v1'
		| 'payment-reminder.v1'
		| 'withdrawal-certificate.v1'
		| 'annual-transcript.v1'
		| 'convocation.v1'
		| 'class-timetable.v1'
		| 'teacher-timetable.v1'
		| 'class-roster.v1'
		| 'attendance-sheet.v1'
		| 'incident-report.v1';

export type DocumentIssuanceStatus
	= | 'requested'
		| 'rendering'
		| 'ready'
		| 'failed'
		| 'superseded'
		| 'voided'
		| 'preview';

export type DocumentLocale = 'fr' | 'en';

export interface DocumentTemplateCatalogItem {
	templateKey: DocumentTemplateKey;
	templateVersion: string;
	locales: DocumentLocale[];
	format: 'pdf';
	sourceType: string;
	numberingKind?: string | null;
	familyDownload: boolean;
	teacherOperational: boolean;
	titles: { fr: string; en: string };
}

export interface DocumentIssuance {
	id: string;
	templateKey: DocumentTemplateKey;
	templateVersion?: string;
	locale: DocumentLocale;
	academicYearId: string;
	sourceType: string;
	sourceId: string;
	sourceVersion: string;
	studentId?: string;
	classGroupId?: string;
	number?: string;
	status: DocumentIssuanceStatus;
	artifactAttachmentId?: string;
	failureCode?: string;
	replacesIssuanceId?: string;
	replacedByIssuanceId?: string;
	voidedAt?: string;
	voidReason?: string;
	createdAt: string;
	familyDownload: boolean;
}

export interface DocumentDownloadGrant {
	downloadUrl: string;
	expiresAt: string;
	fileName: string;
	issuanceId: string;
}

export interface DocumentStaffFields {
	recipient?: string;
	date?: string;
	location?: string;
	reason?: string;
}

export interface RequestDocumentIssuanceInput {
	requestId: string;
	templateKey: DocumentTemplateKey;
	sourceId: string;
	locale?: DocumentLocale;
	academicYearId?: string;
	academicPeriodId?: string;
	classSubjectId?: string;
	studentId?: string;
	classGroupId?: string;
	teacherId?: string;
	staffFields?: DocumentStaffFields;
}

export interface RequestDocumentIssuanceBatchItem {
	sourceId: string;
	requestId: string;
	studentId?: string;
	classGroupId?: string;
	teacherId?: string;
	academicPeriodId?: string;
	classSubjectId?: string;
	staffFields?: DocumentStaffFields;
}

export const STUDENT_GENERATE_TEMPLATE_KEYS: readonly DocumentTemplateKey[] = [
	'schooling-certificate.v1',
	'enrollment-record.v1',
	'student-id-card.v1',
	'invoice.v1',
	'account-statement.v1',
	'payment-reminder.v1',
	'withdrawal-certificate.v1',
	'convocation.v1',
];

export const CONVOCATION_TEMPLATE: DocumentTemplateKey = 'convocation.v1';

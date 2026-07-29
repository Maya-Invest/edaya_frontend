<script lang="ts">
	import type { BillingImportRunResult } from '$lib/import/billing/runner';
	import type {
		BillingImportRow,
		BillingImportValidationContext,
		BillingImportValidationResult,
	} from '$lib/import/billing/types';
	import type { ImportTypeKey } from '$lib/import/catalog/types';
	import type { ChapterImportRunResult } from '$lib/import/chapters/runner';
	import type { ChapterImportRow, ChapterImportValidationResult, ChapterImportCatalogTarget } from '$lib/import/chapters/types';
	import type { ClassImportRunResult } from '$lib/import/classes/runner';
	import type { ClassImportRow, ClassImportValidationResult } from '$lib/import/classes/types';
	import type { GuardianImportRunResult } from '$lib/import/guardians/runner';
	import type { GuardianImportRow, GuardianImportValidationResult } from '$lib/import/guardians/types';
	import type { PaymentImportRunResult } from '$lib/import/payments/runner';
	import type {
		PaymentImportRow,
		PaymentImportValidationContext,
		PaymentImportValidationResult,
	} from '$lib/import/payments/types';
	import type { SchoolSubjectCatalogEntry } from '$lib/import/shared/load-school-subject-names';
	import type { StudentMatriculeEntry } from '$lib/import/shared/load-student-matricule-index';
	import type { StaffImportRunResult } from '$lib/import/staff/runner';
	import type { StaffImportRow, StaffImportValidationResult } from '$lib/import/staff/types';
	import type { StudentImportRunResult } from '$lib/import/students/runner';
	import type { StudentImportRow, StudentImportValidationResult } from '$lib/import/students/types';
	import type { SubjectImportRunResult } from '$lib/import/subjects/runner';
	import type { SubjectImportRow, SubjectImportValidationResult } from '$lib/import/subjects/types';
	import type { TeacherAssignmentImportRunResult } from '$lib/import/teacher-assignments/runner';
	import type {
		TeacherAssignmentImportClassSubjectOption,
		TeacherAssignmentImportRow,
		TeacherAssignmentImportTeacherOption,
		TeacherAssignmentImportValidationResult,
	} from '$lib/import/teacher-assignments/types';
	import type { TeacherImportRunResult } from '$lib/import/teachers/runner';
	import type { TeacherImportRow, TeacherImportValidationResult } from '$lib/import/teachers/types';
	import { academicContext } from '$lib/academic/context.svelte';
	import { getBrowserSchoolClient } from '$lib/api/school-client';
	import { authSession } from '$lib/auth/session.svelte';
	import ImportFileDropzone from '$lib/components/school/configuration/ImportFileDropzone.svelte';
	import ImportProgressBar from '$lib/components/school/configuration/ImportProgressBar.svelte';
	import ImportReportDownload from '$lib/components/school/configuration/ImportReportDownload.svelte';
	import ImportValidationSummary from '$lib/components/school/configuration/ImportValidationSummary.svelte';
	import ImportValidationTable from '$lib/components/school/configuration/ImportValidationTable.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import FilterSelect from '$lib/components/ui/filter-select.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { notifyGuardiansListChanged } from '$lib/guardians/notify-guardians-list-changed';
	import { t } from '$lib/i18n';
	import { Download, FileSpreadsheet, LoaderCircle } from '$lib/icons';
	import { loadBillingImportContext } from '$lib/import/billing/load-billing-import-context';
	import { parseBillingImportFile } from '$lib/import/billing/parser';
	import { runBillingImport } from '$lib/import/billing/runner';
	import {
		canImportValidatedBilling,
		validateBillingImportRows,
	} from '$lib/import/billing/validator';
	import { importTypeHasMultiValueColumns } from '$lib/import/catalog/import-multi-value';
	import {
		IMPORT_TYPE_DEFINITIONS,
		getImportTypeDefinition,
	} from '$lib/import/catalog/import-types';
	import { parseChapterImportFile } from '$lib/import/chapters/parser';
	import { runChapterImport } from '$lib/import/chapters/runner';
	import {
		canImportValidatedChapters,
		countChapterImportOperations,
		validateChapterImportRows,
	} from '$lib/import/chapters/validator';
	import { parseClassImportFile } from '$lib/import/classes/parser';
	import { runClassImport } from '$lib/import/classes/runner';
	import {
		canImportValidatedClasses,
		validateClassImportRows,
	} from '$lib/import/classes/validator';
	import { parseGuardianImportFile } from '$lib/import/guardians/parser';
	import { runGuardianImport } from '$lib/import/guardians/runner';
	import {
		canImportValidatedGuardians,
		validateGuardianImportRows,
	} from '$lib/import/guardians/validator';
	import { loadPaymentImportContext } from '$lib/import/payments/load-payment-import-context';
	import { parsePaymentImportFile } from '$lib/import/payments/parser';
	import { runPaymentImport } from '$lib/import/payments/runner';
	import {
		canImportValidatedPayments,
		validatePaymentImportRows,
	} from '$lib/import/payments/validator';
	import { importPreferences } from '$lib/import/preferences/import-preferences.svelte';
	import {
		loadChapterImportContext,
	} from '$lib/import/shared/load-chapter-import-context';
	import {
		loadGuardianCodeIndex,
		loadPaymentReferenceIndex,
		loadStaffCodeIndex,
		loadTeacherCodeIndex,
	} from '$lib/import/shared/load-person-code-index';
	import { loadSchoolSubjectCatalog } from '$lib/import/shared/load-school-subject-names';
	import {
		loadStudentMatriculeIndex,
	} from '$lib/import/shared/load-student-matricule-index';
	import { loadExistingSubjectImportKeys } from '$lib/import/shared/load-subject-import-context';
	import {
		loadTeacherAssignmentImportClassSubjects,
		loadTeacherAssignmentImportTeachers,
	} from '$lib/import/shared/load-teacher-assignment-import-context';
	import {
		downloadImportCsvTemplate,
		downloadImportExcelTemplate,
	} from '$lib/import/shared/template-download';
	import { parseStaffImportFile } from '$lib/import/staff/parser';
	import { runStaffImport } from '$lib/import/staff/runner';
	import {
		canImportValidatedStaff,
		validateStaffImportRows,
	} from '$lib/import/staff/validator';
	import { parseStudentImportFile } from '$lib/import/students/parser';
	import { refreshStudentImportShellContext } from '$lib/import/students/refresh-student-import-shell-context';
	import { runStudentImport } from '$lib/import/students/runner';
	import {
		canImportValidatedStudents,
		validateStudentImportRows,
	} from '$lib/import/students/validator';
	import { parseSubjectImportFile } from '$lib/import/subjects/parser';
	import { runSubjectImport } from '$lib/import/subjects/runner';
	import {
		canImportValidatedSubjects,
		validateSubjectImportRows,
	} from '$lib/import/subjects/validator';
	import { parseTeacherAssignmentImportFile } from '$lib/import/teacher-assignments/parser';
	import { runTeacherAssignmentImport } from '$lib/import/teacher-assignments/runner';
	import {
		canImportValidatedTeacherAssignments,
		validateTeacherAssignmentImportRows,
	} from '$lib/import/teacher-assignments/validator';
	import { parseTeacherImportFile } from '$lib/import/teachers/parser';
	import { runTeacherImport } from '$lib/import/teachers/runner';
	import {
		canImportValidatedTeachers,
		validateTeacherImportRows,
	} from '$lib/import/teachers/validator';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { resolveGradeLevelKeyForClassId } from '$lib/school/next-class-group-id';
	import { notifyStaffListChanged } from '$lib/staff/notify-staff-list-changed';
	import { notifyStudentsListChanged } from '$lib/students/notify-students-list-changed';
	import { notifySubjectsListChanged } from '$lib/subjects/notify-subjects-list-changed';
	import { notifyTeachersListChanged } from '$lib/teachers/notify-teachers-list-changed';
	import { cn } from '$lib/utils';
	import { get } from 'svelte/store';

	type ImportStep = 'download' | 'upload' | 'validate' | 'execute';

	const STEPS: ImportStep[] = ['download', 'upload', 'validate', 'execute'];

	const STEP_LABEL_KEYS: Record<ImportStep, string> = {
		download: 'import.students.stepDownload',
		upload: 'import.students.stepUpload',
		validate: 'import.students.stepValidate',
		execute: 'import.students.stepExecute',
	};

	const STUDENT_PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.students.unsupportedFormat',
		file_too_large: 'import.students.fileTooLarge',
		empty_file: 'import.students.emptyFile',
	};

	const CLASS_PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.classes.unsupportedFormat',
		file_too_large: 'import.classes.fileTooLarge',
		empty_file: 'import.classes.emptyFile',
	};

	const GUARDIAN_PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.guardians.unsupportedFormat',
		file_too_large: 'import.guardians.fileTooLarge',
		empty_file: 'import.guardians.emptyFile',
	};

	const STAFF_PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.staff.unsupportedFormat',
		file_too_large: 'import.staff.fileTooLarge',
		empty_file: 'import.staff.emptyFile',
	};

	const TEACHER_PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.teachers.unsupportedFormat',
		file_too_large: 'import.teachers.fileTooLarge',
		empty_file: 'import.teachers.emptyFile',
	};

	const TEACHER_ASSIGNMENT_PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.teacherAssignments.unsupportedFormat',
		file_too_large: 'import.teacherAssignments.fileTooLarge',
		empty_file: 'import.teacherAssignments.emptyFile',
	};

	const SUBJECT_PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.subjects.unsupportedFormat',
		file_too_large: 'import.subjects.fileTooLarge',
		empty_file: 'import.subjects.emptyFile',
	};

	const CHAPTER_PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.chapters.unsupportedFormat',
		file_too_large: 'import.chapters.fileTooLarge',
		empty_file: 'import.chapters.emptyFile',
	};

	const PAYMENT_PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.payments.unsupportedFormat',
		file_too_large: 'import.payments.fileTooLarge',
		empty_file: 'import.payments.emptyFile',
	};

	const BILLING_PARSE_ERROR_KEYS: Record<string, string> = {
		unsupported_format: 'import.billing.unsupportedFormat',
		file_too_large: 'import.billing.fileTooLarge',
		empty_file: 'import.billing.emptyFile',
	};

	const STUDENT_COLUMN_LABEL_KEYS: Record<string, string> = {
		prenom: 'import.students.columns.prenom',
		nom: 'import.students.columns.nom',
		classe: 'import.students.columns.classe',
		date_naissance: 'import.students.columns.date_naissance',
		genre: 'import.students.columns.genre',
		matricule: 'import.students.columns.matricule',
	};

	const CLASS_COLUMN_LABEL_KEYS: Record<string, string> = {
		nom: 'import.types.classes.columns.nom',
		niveau: 'import.types.classes.columns.niveau',
		capacite: 'import.types.classes.columns.capacite',
	};

	const GUARDIAN_COLUMN_LABEL_KEYS: Record<string, string> = {
		code: 'import.types.guardians.columns.code',
		prenom: 'import.types.guardians.columns.prenom',
		nom: 'import.types.guardians.columns.nom',
		email: 'import.types.guardians.columns.email',
		telephone: 'import.types.guardians.columns.telephone',
		eleve_matricule: 'import.types.guardians.columns.eleve_matricule',
	};

	const STAFF_COLUMN_LABEL_KEYS: Record<string, string> = {
		code: 'import.types.staff.columns.code',
		prenom: 'import.types.staff.columns.prenom',
		nom: 'import.types.staff.columns.nom',
		email: 'import.types.staff.columns.email',
		role: 'import.types.staff.columns.role',
		telephone: 'import.types.staff.columns.telephone',
	};

	const TEACHER_COLUMN_LABEL_KEYS: Record<string, string> = {
		code: 'import.types.teachers.columns.code',
		prenom: 'import.types.teachers.columns.prenom',
		nom: 'import.types.teachers.columns.nom',
		email: 'import.types.teachers.columns.email',
		telephone: 'import.types.teachers.columns.telephone',
	};

	const TEACHER_ASSIGNMENT_COLUMN_LABEL_KEYS: Record<string, string> = {
		code: 'import.types.teacherAssignments.columns.code',
		classe: 'import.types.teacherAssignments.columns.classe',
		matiere: 'import.types.teacherAssignments.columns.matiere',
	};

	const SUBJECT_COLUMN_LABEL_KEYS: Record<string, string> = {
		nom: 'import.types.subjects.columns.nom',
		niveau: 'import.types.subjects.columns.niveau',
		abbreviation: 'import.types.subjects.columns.abbreviation',
		coefficient: 'import.types.subjects.columns.coefficient',
	};

	const CHAPTER_COLUMN_LABEL_KEYS: Record<string, string> = {
		niveau: 'import.types.chapters.columns.niveau',
		matiere: 'import.types.chapters.columns.matiere',
		titre: 'import.types.chapters.columns.titre',
		ordre: 'import.types.chapters.columns.ordre',
		description: 'import.types.chapters.columns.description',
	};

	const PAYMENT_COLUMN_LABEL_KEYS: Record<string, string> = {
		matricule: 'import.payments.columns.matricule',
		type_frais: 'import.payments.columns.type_frais',
		reference: 'import.payments.columns.reference',
		montant: 'import.payments.columns.montant',
		date: 'import.payments.columns.date',
		mode: 'import.payments.columns.mode',
		notes: 'import.payments.columns.notes',
	};

	const BILLING_COLUMN_LABEL_KEYS: Record<string, string> = {
		matricule: 'import.billing.columns.matricule',
		type_frais: 'import.billing.columns.type_frais',
		montant: 'import.billing.columns.montant',
		date_echeance: 'import.billing.columns.date_echeance',
	};

	let {
		open = $bindable(false),
		initialImportType = 'students',
	}: {
		open?: boolean;
		initialImportType?: ImportTypeKey;
	} = $props();

	let step = $state<ImportStep>('download');
	let selectedImportType = $state<ImportTypeKey>('students');
	let selectedFileName = $state('');
	let studentParsedRows = $state<StudentImportRow[]>([]);
	let classParsedRows = $state<ClassImportRow[]>([]);
	let guardianParsedRows = $state<GuardianImportRow[]>([]);
	let staffParsedRows = $state<StaffImportRow[]>([]);
	let teacherParsedRows = $state<TeacherImportRow[]>([]);
	let teacherAssignmentParsedRows = $state<TeacherAssignmentImportRow[]>([]);
	let subjectParsedRows = $state<SubjectImportRow[]>([]);
	let chapterParsedRows = $state<ChapterImportRow[]>([]);
	let paymentParsedRows = $state<PaymentImportRow[]>([]);
	let parseErrorMessage = $state('');
	let parsing = $state(false);
	let studentValidationResult = $state<StudentImportValidationResult | null>(null);
	let classValidationResult = $state<ClassImportValidationResult | null>(null);
	let guardianValidationResult = $state<GuardianImportValidationResult | null>(null);
	let staffValidationResult = $state<StaffImportValidationResult | null>(null);
	let teacherValidationResult = $state<TeacherImportValidationResult | null>(null);
	let teacherAssignmentValidationResult = $state<TeacherAssignmentImportValidationResult | null>(null);
	let subjectValidationResult = $state<SubjectImportValidationResult | null>(null);
	let chapterValidationResult = $state<ChapterImportValidationResult | null>(null);
	let paymentValidationResult = $state<PaymentImportValidationResult | null>(null);
	let billingParsedRows = $state<BillingImportRow[]>([]);
	let billingValidationResult = $state<BillingImportValidationResult | null>(null);
	let studentMatriculeIndex = $state<Map<string, StudentMatriculeEntry>>(new Map());
	let existingMatricules = $state<Set<string>>(new Set());
	let loadingMatricules = $state(false);
	let existingTeacherCodes = $state<Set<string>>(new Set());
	let existingStaffCodes = $state<Set<string>>(new Set());
	let existingGuardianCodes = $state<Set<string>>(new Set());
	let existingPaymentReferences = $state<Set<string>>(new Set());
	let loadingTeacherCodes = $state(false);
	let loadingStaffCodes = $state(false);
	let loadingGuardianCodes = $state(false);
	let loadingPaymentReferences = $state(false);
	let subjectImportExistingKeys = $state<Set<string>>(new Set());
	let loadingSubjectImportContext = $state(false);
	let chapterImportContext = $state<ChapterImportCatalogTarget[]>([]);
	let existingChapterKeys = $state<Set<string>>(new Set());
	let loadingChapterContext = $state(false);
	let paymentImportContext = $state<PaymentImportValidationContext | null>(null);
	let loadingPaymentContext = $state(false);
	let billingImportContext = $state<BillingImportValidationContext | null>(null);
	let loadingBillingContext = $state(false);
	let teacherAssignmentTeachers = $state<TeacherAssignmentImportTeacherOption[]>([]);
	let teacherAssignmentClassSubjects = $state<TeacherAssignmentImportClassSubjectOption[]>([]);
	let teacherAssignmentSubjectCatalog = $state<SchoolSubjectCatalogEntry[]>([]);
	let loadingTeacherAssignmentContext = $state(false);
	let preparingValidation = $state(false);
	let importing = $state(false);
	let importProgress = $state({ current: 0, total: 0 });
	let studentImportResult = $state<StudentImportRunResult | null>(null);
	let classImportResult = $state<ClassImportRunResult | null>(null);
	let guardianImportResult = $state<GuardianImportRunResult | null>(null);
	let staffImportResult = $state<StaffImportRunResult | null>(null);
	let teacherImportResult = $state<TeacherImportRunResult | null>(null);
	let teacherAssignmentImportResult = $state<TeacherAssignmentImportRunResult | null>(null);
	let subjectImportResult = $state<SubjectImportRunResult | null>(null);
	let chapterImportResult = $state<ChapterImportRunResult | null>(null);
	let paymentImportResult = $state<PaymentImportRunResult | null>(null);
	let billingImportResult = $state<BillingImportRunResult | null>(null);
	let importFatalError = $state('');

	const studentsHref = appPath('/(app)/school/students/[[id]]');
	const classesHref = appPath('/(app)/configuration/classes/[[id]]');
	const guardiansHref = appPath('/(app)/school/guardians/[[id]]');
	const staffHref = appPath('/(app)/school/staff/[[id]]');
	const teachersHref = appPath('/(app)/school/teachers/[[id]]');
	const subjectsHref = appPath('/(app)/configuration/subjects/[[id]]');
	const billingHref = appPath('/(app)/finance/billing/[[id]]');
	const selectedDefinition = $derived(getImportTypeDefinition(selectedImportType));
	const isStudentsImport = $derived(selectedImportType === 'students');
	const isClassesImport = $derived(selectedImportType === 'classes');
	const isGuardiansImport = $derived(selectedImportType === 'guardians');
	const isStaffImport = $derived(selectedImportType === 'staff');
	const isTeachersImport = $derived(selectedImportType === 'teachers');
	const isTeacherAssignmentsImport = $derived(selectedImportType === 'teacher_assignments');
	const isSubjectsImport = $derived(selectedImportType === 'subjects');
	const isChaptersImport = $derived(selectedImportType === 'chapters');
	const isBillingImport = $derived(selectedImportType === 'billing');
	const isPaymentsImport = $derived(selectedImportType === 'payments');
	const isWiredImport = $derived(
		isStudentsImport || isClassesImport || isGuardiansImport || isStaffImport || isTeachersImport || isTeacherAssignmentsImport || isSubjectsImport || isChaptersImport || isBillingImport || isPaymentsImport,
	);
	const isActiveImport = $derived(selectedDefinition.status === 'active');
	const showsMultiValueSeparator = $derived(importTypeHasMultiValueColumns(selectedDefinition));
	const selectedImportTypeLabel = $derived($t(selectedDefinition.labelKey));

	function importTemplateDownloadOptions() {
		return { multiValueSeparator: importPreferences.multiValueSeparator };
	}

	function guardianImportValidationContext() {
		return {
			studentMatricules: studentMatriculeIndex,
			multiValueSeparator: importPreferences.multiValueSeparator,
			existingCodes: existingGuardianCodes,
		};
	}

	function importReportFilenameBase(csvFilename: string): string {
		return csvFilename.replace(/\.csv$/i, '');
	}

	const hasClasses = $derived(academicContext.classes.length > 0);
	const hasStudents = $derived(academicContext.studentCount > 0);
	const studentPreviewRows = $derived(studentParsedRows.slice(0, 3));
	const classPreviewRows = $derived(classParsedRows.slice(0, 3));
	const guardianPreviewRows = $derived(guardianParsedRows.slice(0, 3));
	const staffPreviewRows = $derived(staffParsedRows.slice(0, 3));
	const teacherPreviewRows = $derived(teacherParsedRows.slice(0, 3));
	const teacherAssignmentPreviewRows = $derived(teacherAssignmentParsedRows.slice(0, 3));
	const subjectPreviewRows = $derived(subjectParsedRows.slice(0, 3));
	const chapterPreviewRows = $derived(chapterParsedRows.slice(0, 3));
	const paymentPreviewRows = $derived(paymentParsedRows.slice(0, 3));
	const billingPreviewRows = $derived(billingParsedRows.slice(0, 3));
	const hasFeeTypes = $derived((billingImportContext?.fees.length ?? 0) > 0);
	const hasClassSubjects = $derived(chapterImportContext.length > 0);
	const parsedRowCount = $derived.by(() => {
		if (isStudentsImport) {
			return studentParsedRows.length;
		}
		if (isClassesImport) {
			return classParsedRows.length;
		}
		if (isGuardiansImport) {
			return guardianParsedRows.length;
		}
		if (isStaffImport) {
			return staffParsedRows.length;
		}
		if (isTeachersImport) {
			return teacherParsedRows.length;
		}
		if (isTeacherAssignmentsImport) {
			return teacherAssignmentParsedRows.length;
		}
		if (isSubjectsImport) {
			return subjectParsedRows.length;
		}
		if (isChaptersImport) {
			return chapterParsedRows.length;
		}
		if (isBillingImport) {
			return billingParsedRows.length;
		}
		if (isPaymentsImport) {
			return paymentParsedRows.length;
		}
		return 0;
	});
	const showUploadDropzone = $derived(parsing || parsedRowCount === 0);
	const canGoToUpload = $derived.by(() => {
		if (!isActiveImport) {
			return false;
		}
		if (isSubjectsImport && !hasClasses) {
			return false;
		}
		if (isTeacherAssignmentsImport && (!hasClasses || teacherAssignmentTeachers.length === 0 || teacherAssignmentClassSubjects.length === 0)) {
			return false;
		}
		if (isPaymentsImport && !hasStudents) {
			return false;
		}
		if (isBillingImport && !hasStudents) {
			return false;
		}
		if (isBillingImport && billingImportContext && !hasFeeTypes) {
			return false;
		}
		if (isGuardiansImport && !hasStudents) {
			return false;
		}
		if (isChaptersImport && !hasClassSubjects) {
			return false;
		}
		return true;
	});
	const canGoToValidate = $derived(
		isWiredImport && parsedRowCount > 0 && !parseErrorMessage && !parsing && !preparingValidation,
	);
	const canStartStudentImport = $derived(canImportValidatedStudents(studentValidationResult));
	const canStartClassImport = $derived(canImportValidatedClasses(classValidationResult));
	const canStartGuardianImport = $derived(canImportValidatedGuardians(guardianValidationResult));
	const canStartStaffImport = $derived(canImportValidatedStaff(staffValidationResult));
	const canStartTeacherImport = $derived(canImportValidatedTeachers(teacherValidationResult));
	const canStartTeacherAssignmentImport = $derived(
		canImportValidatedTeacherAssignments(teacherAssignmentValidationResult),
	);
	const canStartSubjectImport = $derived(canImportValidatedSubjects(subjectValidationResult));
	const canStartChapterImport = $derived(canImportValidatedChapters(chapterValidationResult));
	const canStartPaymentImport = $derived(canImportValidatedPayments(paymentValidationResult));
	const canStartBillingImport = $derived(canImportValidatedBilling(billingValidationResult));
	const chapterImportOperationCount = $derived(
		chapterValidationResult
			? countChapterImportOperations(chapterValidationResult.validRows)
			: 0,
	);
	const canStartImport = $derived.by(() => {
		if (isStudentsImport) {
			return canStartStudentImport;
		}
		if (isClassesImport) {
			return canStartClassImport;
		}
		if (isGuardiansImport) {
			return canStartGuardianImport;
		}
		if (isStaffImport) {
			return canStartStaffImport;
		}
		if (isTeachersImport) {
			return canStartTeacherImport;
		}
		if (isTeacherAssignmentsImport) {
			return canStartTeacherAssignmentImport;
		}
		if (isSubjectsImport) {
			return canStartSubjectImport;
		}
		if (isChaptersImport) {
			return canStartChapterImport;
		}
		if (isBillingImport) {
			return canStartBillingImport;
		}
		if (isPaymentsImport) {
			return canStartPaymentImport;
		}
		return false;
	});
	const activeValidationResult = $derived.by(() => {
		if (isStudentsImport) {
			return studentValidationResult;
		}
		if (isClassesImport) {
			return classValidationResult;
		}
		if (isGuardiansImport) {
			return guardianValidationResult;
		}
		if (isStaffImport) {
			return staffValidationResult;
		}
		if (isTeachersImport) {
			return teacherValidationResult;
		}
		if (isTeacherAssignmentsImport) {
			return teacherAssignmentValidationResult;
		}
		if (isSubjectsImport) {
			return subjectValidationResult;
		}
		if (isChaptersImport) {
			return chapterValidationResult;
		}
		if (isBillingImport) {
			return billingValidationResult;
		}
		if (isPaymentsImport) {
			return paymentValidationResult;
		}
		return null;
	});
	const activeValidRowCount = $derived(activeValidationResult?.validRows.length ?? 0);
	const studentValidationIssues = $derived([
		...(studentValidationResult?.errors ?? []),
		...(studentValidationResult?.warnings ?? []),
	]);
	const studentBlockedValidationCount = $derived(studentValidationResult?.errors.length ?? 0);
	const classValidationIssues = $derived([
		...(classValidationResult?.errors ?? []),
		...(classValidationResult?.warnings ?? []),
	]);
	const guardianValidationIssues = $derived([
		...(guardianValidationResult?.errors ?? []),
		...(guardianValidationResult?.warnings ?? []),
	]);
	const staffValidationIssues = $derived([
		...(staffValidationResult?.errors ?? []),
		...(staffValidationResult?.warnings ?? []),
	]);
	const teacherValidationIssues = $derived([
		...(teacherValidationResult?.errors ?? []),
		...(teacherValidationResult?.warnings ?? []),
	]);
	const teacherAssignmentValidationIssues = $derived([
		...(teacherAssignmentValidationResult?.errors ?? []),
		...(teacherAssignmentValidationResult?.warnings ?? []),
	]);
	const subjectValidationIssues = $derived([
		...(subjectValidationResult?.errors ?? []),
		...(subjectValidationResult?.warnings ?? []),
	]);
	const chapterValidationIssues = $derived([
		...(chapterValidationResult?.errors ?? []),
		...(chapterValidationResult?.warnings ?? []),
	]);
	const paymentValidationIssues = $derived([
		...(paymentValidationResult?.errors ?? []),
		...(paymentValidationResult?.warnings ?? []),
	]);
	const billingValidationIssues = $derived([
		...(billingValidationResult?.errors ?? []),
		...(billingValidationResult?.warnings ?? []),
	]);
	const importReadyLabel = $derived.by(() => {
		if (isStudentsImport) {
			return $t('import.students.importReady', { n: activeValidRowCount });
		}
		if (isClassesImport) {
			return $t('import.classes.importReady', { n: activeValidRowCount });
		}
		if (isGuardiansImport) {
			return $t('import.guardians.importReady', { n: activeValidRowCount });
		}
		if (isStaffImport) {
			return $t('import.staff.importReady', { n: activeValidRowCount });
		}
		if (isTeachersImport) {
			return $t('import.teachers.importReady', { n: activeValidRowCount });
		}
		if (isTeacherAssignmentsImport) {
			return $t('import.teacherAssignments.importReady', { n: activeValidRowCount });
		}
		if (isSubjectsImport) {
			return $t('import.subjects.importReady', { n: activeValidRowCount });
		}
		if (isPaymentsImport) {
			return $t('import.payments.importReady', { n: activeValidRowCount });
		}
		if (isBillingImport) {
			return $t('import.billing.importReady', { n: activeValidRowCount });
		}
		return $t('import.chapters.importReady', { n: chapterImportOperationCount });
	});
	const showSubjectsPrerequisite = $derived(
		isSubjectsImport && step === 'download' && !hasClasses,
	);
	const showTeacherAssignmentsPrerequisite = $derived(
		isTeacherAssignmentsImport
		&& step === 'download'
			&& (
				!hasClasses
				|| (teacherAssignmentTeachers.length === 0 && !loadingTeacherAssignmentContext)
				|| (teacherAssignmentClassSubjects.length === 0 && !loadingTeacherAssignmentContext)
			),
	);
	const showPaymentsPrerequisite = $derived(
		isPaymentsImport && step === 'download' && !hasStudents,
	);
	const showBillingStudentsPrerequisite = $derived(
		isBillingImport && step === 'download' && !hasStudents,
	);
	const showBillingFeesPrerequisite = $derived(
		isBillingImport && step === 'download' && hasStudents && billingImportContext !== null && !hasFeeTypes,
	);
	const showChaptersPrerequisite = $derived(
		isChaptersImport && step === 'download' && !hasClassSubjects,
	);
	const showGuardiansPrerequisite = $derived(
		isGuardiansImport && step === 'download' && !hasStudents,
	);

	function resetWizard() {
		step = 'download';
		selectedFileName = '';
		studentParsedRows = [];
		classParsedRows = [];
		guardianParsedRows = [];
		staffParsedRows = [];
		teacherParsedRows = [];
		teacherAssignmentParsedRows = [];
		subjectParsedRows = [];
		chapterParsedRows = [];
		paymentParsedRows = [];
		billingParsedRows = [];
		parseErrorMessage = '';
		parsing = false;
		studentValidationResult = null;
		classValidationResult = null;
		guardianValidationResult = null;
		staffValidationResult = null;
		teacherValidationResult = null;
		teacherAssignmentValidationResult = null;
		subjectValidationResult = null;
		chapterValidationResult = null;
		paymentValidationResult = null;
		billingValidationResult = null;
		importing = false;
		importProgress = { current: 0, total: 0 };
		studentImportResult = null;
		classImportResult = null;
		guardianImportResult = null;
		staffImportResult = null;
		teacherImportResult = null;
		teacherAssignmentImportResult = null;
		subjectImportResult = null;
		chapterImportResult = null;
		paymentImportResult = null;
		billingImportResult = null;
		importFatalError = '';
		studentMatriculeIndex = new Map();
		existingMatricules = new Set();
		existingTeacherCodes = new Set();
		existingStaffCodes = new Set();
		existingGuardianCodes = new Set();
		existingPaymentReferences = new Set();
		subjectImportExistingKeys = new Set();
		chapterImportContext = [];
		existingChapterKeys = new Set();
		paymentImportContext = null;
		billingImportContext = null;
		teacherAssignmentTeachers = [];
		teacherAssignmentClassSubjects = [];
		teacherAssignmentSubjectCatalog = [];
	}

	function handleOpenChange(next: boolean) {
		open = next;
		if (next) {
			selectedImportType = initialImportType;
			resetWizard();
			void loadStudentMatriculeDataIfNeeded();
			void loadTeacherCodeIndexIfNeeded();
			void loadStaffCodeIndexIfNeeded();
			void loadGuardianCodeIndexIfNeeded();
			void loadPaymentReferenceIndexIfNeeded();
			void loadChapterImportContextIfNeeded();
			void loadPaymentImportContextIfNeeded();
			void loadBillingImportContextIfNeeded();
			void loadTeacherAssignmentImportContextIfNeeded();
			return;
		}
		resetWizard();
	}

	function handleImportTypeChange(next: string) {
		const importType = next as ImportTypeKey;
		if (importType === selectedImportType) {
			return;
		}
		selectedImportType = importType;
		resetWizard();
		void loadStudentMatriculeDataIfNeeded();
		void loadTeacherCodeIndexIfNeeded();
		void loadStaffCodeIndexIfNeeded();
		void loadGuardianCodeIndexIfNeeded();
		void loadPaymentReferenceIndexIfNeeded();
		void loadChapterImportContextIfNeeded();
		void loadPaymentImportContextIfNeeded();
		void loadBillingImportContextIfNeeded();
		void loadTeacherAssignmentImportContextIfNeeded();
	}

	function stepIndex(value: ImportStep): number {
		return STEPS.indexOf(value);
	}

	function formatParseError(message: string): string {
		let keyMap = STUDENT_PARSE_ERROR_KEYS;
		if (isPaymentsImport) {
			keyMap = PAYMENT_PARSE_ERROR_KEYS;
		}
		else if (isBillingImport) {
			keyMap = BILLING_PARSE_ERROR_KEYS;
		}
		else if (isChaptersImport) {
			keyMap = CHAPTER_PARSE_ERROR_KEYS;
		}
		else if (isSubjectsImport) {
			keyMap = SUBJECT_PARSE_ERROR_KEYS;
		}
		else if (isTeachersImport) {
			keyMap = TEACHER_PARSE_ERROR_KEYS;
		}
		else if (isTeacherAssignmentsImport) {
			keyMap = TEACHER_ASSIGNMENT_PARSE_ERROR_KEYS;
		}
		else if (isStaffImport) {
			keyMap = STAFF_PARSE_ERROR_KEYS;
		}
		else if (isGuardiansImport) {
			keyMap = GUARDIAN_PARSE_ERROR_KEYS;
		}
		else if (isClassesImport) {
			keyMap = CLASS_PARSE_ERROR_KEYS;
		}
		const key = keyMap[message];
		return key ? get(t)(key) : message;
	}

	function clearParsedState() {
		studentParsedRows = [];
		classParsedRows = [];
		guardianParsedRows = [];
		staffParsedRows = [];
		teacherParsedRows = [];
		teacherAssignmentParsedRows = [];
		subjectParsedRows = [];
		chapterParsedRows = [];
		paymentParsedRows = [];
		billingParsedRows = [];
		parseErrorMessage = '';
		studentValidationResult = null;
		classValidationResult = null;
		guardianValidationResult = null;
		staffValidationResult = null;
		teacherValidationResult = null;
		teacherAssignmentValidationResult = null;
		subjectValidationResult = null;
		chapterValidationResult = null;
		paymentValidationResult = null;
		billingValidationResult = null;
	}

	async function loadPaymentImportContextIfNeeded() {
		if (!isPaymentsImport) {
			return;
		}
		if (loadingPaymentContext || paymentImportContext) {
			return;
		}
		const schoolId = authSession.schoolId;
		const academicYearId = academicContext.yearId;
		if (!schoolId || !academicYearId) {
			paymentImportContext = null;
			return;
		}
		loadingPaymentContext = true;
		try {
			paymentImportContext = await loadPaymentImportContext(getBrowserSchoolClient(), {
				schoolId,
				academicYearId,
			});
		}
		catch {
			paymentImportContext = null;
		}
		finally {
			loadingPaymentContext = false;
		}
	}

	async function loadBillingImportContextIfNeeded() {
		if (!isBillingImport) {
			return;
		}
		if (loadingBillingContext || billingImportContext) {
			return;
		}
		const schoolId = authSession.schoolId;
		const academicYearId = academicContext.yearId;
		if (!schoolId || !academicYearId) {
			billingImportContext = null;
			return;
		}
		loadingBillingContext = true;
		try {
			billingImportContext = await loadBillingImportContext(getBrowserSchoolClient(), {
				schoolId,
				academicYearId,
			});
		}
		catch {
			billingImportContext = null;
		}
		finally {
			loadingBillingContext = false;
		}
	}

	async function loadChapterImportContextIfNeeded() {
		if (!isChaptersImport) {
			return;
		}
		if (loadingChapterContext) {
			return;
		}
		loadingChapterContext = true;
		try {
			const loaded = await loadChapterImportContext(
				getBrowserSchoolClient(),
				academicContext.classes.map(classGroup => ({
					id: classGroup.id,
					name: classGroup.name,
					gradeLevelId: classGroup.gradeLevelId,
				})),
				academicContext.gradeLevels.map(gradeLevel => ({
					id: gradeLevel.id,
					name: gradeLevel.name,
				})),
			);
			chapterImportContext = loaded.targets;
			existingChapterKeys = loaded.existingChapterKeys;
		}
		catch {
			chapterImportContext = [];
			existingChapterKeys = new Set();
		}
		finally {
			loadingChapterContext = false;
		}
	}

	async function loadStudentMatriculeDataIfNeeded() {
		if (!isStudentsImport && !isGuardiansImport && !isPaymentsImport && !isBillingImport) {
			return;
		}
		if (loadingMatricules || studentMatriculeIndex.size > 0) {
			return;
		}
		loadingMatricules = true;
		try {
			studentMatriculeIndex = await loadStudentMatriculeIndex();
			existingMatricules = new Set(studentMatriculeIndex.keys());
		}
		catch {
			studentMatriculeIndex = new Map();
			existingMatricules = new Set();
		}
		finally {
			loadingMatricules = false;
		}
	}

	async function loadTeacherCodeIndexIfNeeded() {
		if (!isTeachersImport) {
			return;
		}
		if (loadingTeacherCodes || existingTeacherCodes.size > 0) {
			return;
		}
		loadingTeacherCodes = true;
		try {
			const index = await loadTeacherCodeIndex();
			existingTeacherCodes = new Set(index.keys());
		}
		catch {
			existingTeacherCodes = new Set();
		}
		finally {
			loadingTeacherCodes = false;
		}
	}

	async function loadStaffCodeIndexIfNeeded() {
		if (!isStaffImport) {
			return;
		}
		if (loadingStaffCodes || existingStaffCodes.size > 0) {
			return;
		}
		loadingStaffCodes = true;
		try {
			const index = await loadStaffCodeIndex();
			existingStaffCodes = new Set(index.keys());
		}
		catch {
			existingStaffCodes = new Set();
		}
		finally {
			loadingStaffCodes = false;
		}
	}

	async function loadGuardianCodeIndexIfNeeded() {
		if (!isGuardiansImport) {
			return;
		}
		if (loadingGuardianCodes || existingGuardianCodes.size > 0) {
			return;
		}
		loadingGuardianCodes = true;
		try {
			const index = await loadGuardianCodeIndex();
			existingGuardianCodes = new Set(index.keys());
		}
		catch {
			existingGuardianCodes = new Set();
		}
		finally {
			loadingGuardianCodes = false;
		}
	}

	async function loadPaymentReferenceIndexIfNeeded() {
		if (!isPaymentsImport) {
			return;
		}
		if (loadingPaymentReferences || existingPaymentReferences.size > 0) {
			return;
		}
		loadingPaymentReferences = true;
		try {
			existingPaymentReferences = new Set(await loadPaymentReferenceIndex());
		}
		catch {
			existingPaymentReferences = new Set();
		}
		finally {
			loadingPaymentReferences = false;
		}
	}

	async function loadSubjectImportContextIfNeeded() {
		if (!isSubjectsImport) {
			return;
		}
		if (loadingSubjectImportContext) {
			return;
		}
		loadingSubjectImportContext = true;
		try {
			const classGradeLevelById = Object.fromEntries(
				academicContext.classes.map(classGroup => [classGroup.id, classGroup.gradeLevelId]),
			);
			subjectImportExistingKeys = await loadExistingSubjectImportKeys(classGradeLevelById);
		}
		catch {
			subjectImportExistingKeys = new Set();
		}
		finally {
			loadingSubjectImportContext = false;
		}
	}

	async function loadTeacherAssignmentImportContextIfNeeded() {
		if (!isTeacherAssignmentsImport) {
			return;
		}
		if (loadingTeacherAssignmentContext) {
			return;
		}
		const schoolId = authSession.schoolId;
		if (!schoolId) {
			teacherAssignmentTeachers = [];
			teacherAssignmentClassSubjects = [];
			teacherAssignmentSubjectCatalog = [];
			return;
		}
		loadingTeacherAssignmentContext = true;
		try {
			const client = getBrowserSchoolClient();
			const [teachers, classSubjects, subjectCatalog] = await Promise.all([
				loadTeacherAssignmentImportTeachers(client, schoolId),
				loadTeacherAssignmentImportClassSubjects(client),
				loadSchoolSubjectCatalog(),
			]);
			teacherAssignmentTeachers = teachers;
			teacherAssignmentClassSubjects = classSubjects;
			teacherAssignmentSubjectCatalog = subjectCatalog;
		}
		catch {
			teacherAssignmentTeachers = [];
			teacherAssignmentClassSubjects = [];
			teacherAssignmentSubjectCatalog = [];
		}
		finally {
			loadingTeacherAssignmentContext = false;
		}
	}

	function runValidation() {
		if (isStudentsImport) {
			studentValidationResult = validateStudentImportRows(studentParsedRows, {
				classes: academicContext.classes.map(classGroup => ({
					id: classGroup.id,
					name: classGroup.name,
					studentCount: classGroup.studentCount,
					capacity: classGroup.capacity,
				})),
				existingMatricules,
			});
			return;
		}

		if (isClassesImport) {
			classValidationResult = validateClassImportRows(classParsedRows, {
				gradeLevels: academicContext.gradeLevels.map(gradeLevel => ({
					id: gradeLevel.id,
					name: gradeLevel.name,
				})),
				existingClasses: academicContext.classes.map(classGroup => ({
					id: classGroup.id,
					name: classGroup.name,
					gradeLevelId: classGroup.gradeLevelId,
				})),
			});
			return;
		}

		if (isGuardiansImport) {
			guardianValidationResult = validateGuardianImportRows(guardianParsedRows, guardianImportValidationContext());
			return;
		}

		if (isStaffImport) {
			staffValidationResult = validateStaffImportRows(staffParsedRows, { existingCodes: existingStaffCodes });
			return;
		}

		if (isTeachersImport) {
			teacherValidationResult = validateTeacherImportRows(teacherParsedRows, { existingCodes: existingTeacherCodes });
			return;
		}

		if (isTeacherAssignmentsImport) {
			teacherAssignmentValidationResult = validateTeacherAssignmentImportRows(teacherAssignmentParsedRows, {
				teachers: teacherAssignmentTeachers,
				classes: academicContext.classes.map(classGroup => ({
					id: classGroup.id,
					name: classGroup.name,
				})),
				subjectCatalog: teacherAssignmentSubjectCatalog,
				classSubjects: teacherAssignmentClassSubjects,
			});
			return;
		}

		if (isSubjectsImport) {
			subjectValidationResult = validateSubjectImportRows(subjectParsedRows, {
				gradeLevels: academicContext.gradeLevels.map(gradeLevel => ({
					id: gradeLevel.id,
					name: gradeLevel.name,
				})),
				classGroups: academicContext.classes.map(classGroup => ({
					id: classGroup.id,
					gradeLevelId: classGroup.gradeLevelId,
				})),
				existingSubjectKeys: subjectImportExistingKeys,
			});
			return;
		}

		if (isPaymentsImport && paymentImportContext) {
			paymentValidationResult = validatePaymentImportRows(paymentParsedRows, {
				...paymentImportContext,
				existingReferences: existingPaymentReferences,
			});
			return;
		}

		if (isBillingImport && billingImportContext) {
			billingValidationResult = validateBillingImportRows(billingParsedRows, billingImportContext);
			return;
		}

		if (isChaptersImport) {
			chapterValidationResult = validateChapterImportRows(chapterParsedRows, {
				catalogTargets: chapterImportContext,
				existingChapterKeys,
			});
		}
	}

	async function refreshStudentImportShellIfNeeded() {
		if (!isStudentsImport) {
			return;
		}
		await refreshStudentImportShellContext();
	}

	async function goToValidateStep() {
		preparingValidation = true;
		try {
			await refreshStudentImportShellIfNeeded();
			await loadStudentMatriculeDataIfNeeded();
			await loadTeacherCodeIndexIfNeeded();
			await loadStaffCodeIndexIfNeeded();
			await loadGuardianCodeIndexIfNeeded();
			await loadPaymentReferenceIndexIfNeeded();
			await loadSubjectImportContextIfNeeded();
			await loadTeacherAssignmentImportContextIfNeeded();
			await loadChapterImportContextIfNeeded();
			await loadPaymentImportContextIfNeeded();
			await loadBillingImportContextIfNeeded();
			runValidation();
			step = 'validate';
		}
		finally {
			preparingValidation = false;
		}
	}

	function buildClassSiblingCounts(): Record<string, number> {
		const counts: Record<string, number> = {};
		for (const classGroup of academicContext.classes) {
			const key = resolveGradeLevelKeyForClassId(
				classGroup.gradeLevelId,
				academicContext.gradeLevelById(classGroup.gradeLevelId)?.name,
			);
			counts[key] = (counts[key] ?? 0) + 1;
		}
		return counts;
	}

	function buildClassNameById(): Map<string, string> {
		return new Map(academicContext.classes.map(classGroup => [classGroup.id, classGroup.name]));
	}

	async function startStudentImport() {
		if (!studentValidationResult || !canStartStudentImport || importing) {
			return;
		}

		const schoolId = authSession.schoolId;
		if (!schoolId) {
			return;
		}

		importing = true;
		studentImportResult = null;
		importFatalError = '';
		importProgress = { current: 0, total: studentValidationResult.validRows.length };
		step = 'execute';

		try {
			studentImportResult = await runStudentImport({
				schoolId,
				client: getBrowserSchoolClient(),
				rows: studentValidationResult.validRows,
				classNameById: buildClassNameById(),
				onProgress: (current, total) => {
					importProgress = { current, total };
				},
			});
		}
		catch (error) {
			importFatalError = error instanceof Error && error.message.trim().length > 0
				? error.message
				: get(t)('import.students.importFailed');
			studentImportResult = {
				created: 0,
				failed: [],
				warnings: [],
				studentIds: [],
			};
		}
		finally {
			importing = false;
		}
	}

	async function startClassImport() {
		if (!classValidationResult || !canStartClassImport || importing) {
			return;
		}

		const schoolId = authSession.schoolId;
		const academicYearId = academicContext.yearId;
		if (!schoolId || !academicYearId) {
			return;
		}

		importing = true;
		classImportResult = null;
		importFatalError = '';
		importProgress = { current: 0, total: classValidationResult.validRows.length };
		step = 'execute';

		try {
			classImportResult = await runClassImport({
				schoolId,
				academicYearId,
				client: getBrowserSchoolClient(),
				rows: classValidationResult.validRows,
				existingClassIds: academicContext.classes.map(classGroup => classGroup.id),
				siblingCountByGrade: buildClassSiblingCounts(),
				gradeLevelNameById: new Map(
					academicContext.gradeLevels.map(level => [level.id, level.name]),
				),
				onProgress: (current, total) => {
					importProgress = { current, total };
				},
			});
		}
		catch (error) {
			importFatalError = error instanceof Error && error.message.trim().length > 0
				? error.message
				: get(t)('import.classes.importFailed');
			classImportResult = {
				created: 0,
				failed: [],
				classIds: [],
			};
		}
		finally {
			importing = false;
		}
	}

	async function startGuardianImport() {
		if (!guardianValidationResult || !canStartGuardianImport || importing) {
			return;
		}

		const schoolId = authSession.schoolId;
		if (!schoolId) {
			return;
		}

		importing = true;
		guardianImportResult = null;
		importFatalError = '';
		importProgress = { current: 0, total: guardianValidationResult.validRows.length };
		step = 'execute';

		try {
			guardianImportResult = await runGuardianImport({
				schoolId,
				client: getBrowserSchoolClient(),
				rows: guardianValidationResult.validRows,
				onProgress: (current, total) => {
					importProgress = { current, total };
				},
			});
		}
		catch (error) {
			importFatalError = error instanceof Error && error.message.trim().length > 0
				? error.message
				: get(t)('import.guardians.importFailed');
			guardianImportResult = {
				created: 0,
				linksCreated: 0,
				failed: [],
				guardianIds: [],
			};
		}
		finally {
			importing = false;
		}
	}

	async function startStaffImport() {
		if (!staffValidationResult || !canStartStaffImport || importing) {
			return;
		}

		const schoolId = authSession.schoolId;
		if (!schoolId) {
			return;
		}

		importing = true;
		staffImportResult = null;
		importFatalError = '';
		importProgress = { current: 0, total: staffValidationResult.validRows.length };
		step = 'execute';

		try {
			staffImportResult = await runStaffImport({
				schoolId,
				client: getBrowserSchoolClient(),
				rows: staffValidationResult.validRows,
				onProgress: (current, total) => {
					importProgress = { current, total };
				},
			});
		}
		catch (error) {
			importFatalError = error instanceof Error && error.message.trim().length > 0
				? error.message
				: get(t)('import.staff.importFailed');
			staffImportResult = {
				created: 0,
				failed: [],
				staffIds: [],
			};
		}
		finally {
			importing = false;
		}
	}

	async function startTeacherImport() {
		if (!teacherValidationResult || !canStartTeacherImport || importing) {
			return;
		}

		const schoolId = authSession.schoolId;
		const academicYearId = academicContext.yearId;
		if (!schoolId || !academicYearId) {
			return;
		}

		importing = true;
		teacherImportResult = null;
		importFatalError = '';
		importProgress = { current: 0, total: teacherValidationResult.validRows.length };
		step = 'execute';

		try {
			teacherImportResult = await runTeacherImport({
				schoolId,
				academicYearId,
				client: getBrowserSchoolClient(),
				rows: teacherValidationResult.validRows,
				onProgress: (current, total) => {
					importProgress = { current, total };
				},
			});
		}
		catch (error) {
			importFatalError = error instanceof Error && error.message.trim().length > 0
				? error.message
				: get(t)('import.teachers.importFailed');
			teacherImportResult = {
				created: 0,
				failed: [],
				teacherIds: [],
			};
		}
		finally {
			importing = false;
		}
	}

	async function startTeacherAssignmentImport() {
		if (!teacherAssignmentValidationResult || !canStartTeacherAssignmentImport || importing) {
			return;
		}

		const academicYearId = academicContext.yearId;
		if (!academicYearId) {
			return;
		}

		importing = true;
		teacherAssignmentImportResult = null;
		importFatalError = '';
		importProgress = { current: 0, total: teacherAssignmentValidationResult.validRows.length };
		step = 'execute';

		try {
			teacherAssignmentImportResult = await runTeacherAssignmentImport({
				academicYearId,
				client: getBrowserSchoolClient(),
				rows: teacherAssignmentValidationResult.validRows,
				onProgress: (current, total) => {
					importProgress = { current, total };
				},
			});
		}
		catch (error) {
			importFatalError = error instanceof Error && error.message.trim().length > 0
				? error.message
				: get(t)('import.teacherAssignments.importFailed');
			teacherAssignmentImportResult = {
				created: 0,
				failed: [],
				assignmentIds: [],
			};
		}
		finally {
			importing = false;
		}
	}

	async function startSubjectImport() {
		if (!subjectValidationResult || !canStartSubjectImport || importing) {
			return;
		}

		const schoolId = authSession.schoolId;
		if (!schoolId) {
			return;
		}

		importing = true;
		subjectImportResult = null;
		importFatalError = '';
		importProgress = { current: 0, total: subjectValidationResult.validRows.length };
		step = 'execute';

		try {
			subjectImportResult = await runSubjectImport({
				schoolId,
				academicYearId: academicContext.yearId ?? academicContext.year?.id ?? '',
				client: getBrowserSchoolClient(),
				rows: subjectValidationResult.validRows,
				onProgress: (current, total) => {
					importProgress = { current, total };
				},
			});
		}
		catch (error) {
			importFatalError = error instanceof Error && error.message.trim().length > 0
				? error.message
				: get(t)('import.subjects.importFailed');
			subjectImportResult = {
				created: 0,
				failed: [],
				gradeLevelSubjectIds: [],
			};
		}
		finally {
			importing = false;
		}
	}

	async function startBillingImport() {
		if (!billingValidationResult || !canStartBillingImport || importing) {
			return;
		}

		importing = true;
		billingImportResult = null;
		importFatalError = '';
		importProgress = { current: 0, total: billingValidationResult.validRows.length };
		step = 'execute';

		try {
			billingImportResult = await runBillingImport({
				client: getBrowserSchoolClient(),
				rows: billingValidationResult.validRows,
				onProgress: (current, total) => {
					importProgress = { current, total };
				},
			});
		}
		catch (error) {
			importFatalError = error instanceof Error && error.message.trim().length > 0
				? error.message
				: get(t)('import.billing.importFailed');
			billingImportResult = {
				created: 0,
				failed: [],
				studentFeeIds: [],
			};
		}
		finally {
			importing = false;
		}
	}

	async function startPaymentImport() {
		if (!paymentValidationResult || !canStartPaymentImport || importing) {
			return;
		}

		importing = true;
		paymentImportResult = null;
		importFatalError = '';
		importProgress = { current: 0, total: paymentValidationResult.validRows.length };
		step = 'execute';

		try {
			paymentImportResult = await runPaymentImport({
				client: getBrowserSchoolClient(),
				rows: paymentValidationResult.validRows,
				onProgress: (current, total) => {
					importProgress = { current, total };
				},
			});
		}
		catch (error) {
			importFatalError = error instanceof Error && error.message.trim().length > 0
				? error.message
				: get(t)('import.payments.importFailed');
			paymentImportResult = {
				created: 0,
				failed: [],
				paymentIds: [],
			};
		}
		finally {
			importing = false;
		}
	}

	async function startImport() {
		if (isStudentsImport) {
			await startStudentImport();
			return;
		}
		if (isClassesImport) {
			await startClassImport();
			return;
		}
		if (isGuardiansImport) {
			await startGuardianImport();
			return;
		}
		if (isStaffImport) {
			await startStaffImport();
			return;
		}
		if (isTeachersImport) {
			await startTeacherImport();
			return;
		}
		if (isTeacherAssignmentsImport) {
			await startTeacherAssignmentImport();
			return;
		}
		if (isSubjectsImport) {
			await startSubjectImport();
			return;
		}
		if (isChaptersImport) {
			await startChapterImport();
			return;
		}
		if (isBillingImport) {
			await startBillingImport();
			return;
		}
		if (isPaymentsImport) {
			await startPaymentImport();
		}
	}

	async function startChapterImport() {
		if (!chapterValidationResult || !canStartChapterImport || importing) {
			return;
		}

		importing = true;
		chapterImportResult = null;
		importFatalError = '';
		importProgress = {
			current: 0,
			total: countChapterImportOperations(chapterValidationResult.validRows),
		};
		step = 'execute';

		try {
			chapterImportResult = await runChapterImport({
				client: getBrowserSchoolClient(),
				rows: chapterValidationResult.validRows,
				onProgress: (current, total) => {
					importProgress = { current, total };
				},
			});
		}
		catch (error) {
			importFatalError = error instanceof Error && error.message.trim().length > 0
				? error.message
				: get(t)('import.chapters.importFailed');
			chapterImportResult = {
				created: 0,
				failed: [],
				matterIds: [],
			};
		}
		finally {
			importing = false;
		}
	}

	async function handleFileSelected(file: File) {
		if (!isWiredImport) {
			return;
		}

		selectedFileName = file.name;
		parsing = true;
		clearParsedState();

		try {
			if (isStudentsImport) {
				const result = await parseStudentImportFile(file);
				studentParsedRows = result.rows;

				if (result.errors.length > 0) {
					parseErrorMessage = formatParseError(result.errors[0]?.message ?? 'parse_error');
				}
				else if (result.rows.length === 0) {
					parseErrorMessage = get(t)('import.students.emptyFile');
				}
			}
			else if (isClassesImport) {
				const result = await parseClassImportFile(file);
				classParsedRows = result.rows;

				if (result.errors.length > 0) {
					parseErrorMessage = formatParseError(result.errors[0]?.message ?? 'parse_error');
				}
				else if (result.rows.length === 0) {
					parseErrorMessage = get(t)('import.classes.emptyFile');
				}
			}
			else if (isGuardiansImport) {
				const result = await parseGuardianImportFile(file);
				guardianParsedRows = result.rows;

				if (result.errors.length > 0) {
					parseErrorMessage = formatParseError(result.errors[0]?.message ?? 'parse_error');
				}
				else if (result.rows.length === 0) {
					parseErrorMessage = get(t)('import.guardians.emptyFile');
				}
			}
			else if (isStaffImport) {
				const result = await parseStaffImportFile(file);
				staffParsedRows = result.rows;

				if (result.errors.length > 0) {
					parseErrorMessage = formatParseError(result.errors[0]?.message ?? 'parse_error');
				}
				else if (result.rows.length === 0) {
					parseErrorMessage = get(t)('import.staff.emptyFile');
				}
			}
			else if (isTeachersImport) {
				const result = await parseTeacherImportFile(file);
				teacherParsedRows = result.rows;

				if (result.errors.length > 0) {
					parseErrorMessage = formatParseError(result.errors[0]?.message ?? 'parse_error');
				}
				else if (result.rows.length === 0) {
					parseErrorMessage = get(t)('import.teachers.emptyFile');
				}
			}
			else if (isTeacherAssignmentsImport) {
				const result = await parseTeacherAssignmentImportFile(file);
				teacherAssignmentParsedRows = result.rows;

				if (result.errors.length > 0) {
					parseErrorMessage = formatParseError(result.errors[0]?.message ?? 'parse_error');
				}
				else if (result.rows.length === 0) {
					parseErrorMessage = get(t)('import.teacherAssignments.emptyFile');
				}
			}
			else if (isSubjectsImport) {
				const result = await parseSubjectImportFile(file);
				subjectParsedRows = result.rows;

				if (result.errors.length > 0) {
					parseErrorMessage = formatParseError(result.errors[0]?.message ?? 'parse_error');
				}
				else if (result.rows.length === 0) {
					parseErrorMessage = get(t)('import.subjects.emptyFile');
				}
			}
			else if (isChaptersImport) {
				const result = await parseChapterImportFile(file);
				chapterParsedRows = result.rows;

				if (result.errors.length > 0) {
					parseErrorMessage = formatParseError(result.errors[0]?.message ?? 'parse_error');
				}
				else if (result.rows.length === 0) {
					parseErrorMessage = get(t)('import.chapters.emptyFile');
				}
			}
			else if (isBillingImport) {
				const result = await parseBillingImportFile(file);
				billingParsedRows = result.rows;

				if (result.errors.length > 0) {
					parseErrorMessage = formatParseError(result.errors[0]?.message ?? 'parse_error');
				}
				else if (result.rows.length === 0) {
					parseErrorMessage = get(t)('import.billing.emptyFile');
				}
			}
			else if (isPaymentsImport) {
				const result = await parsePaymentImportFile(file);
				paymentParsedRows = result.rows;

				if (result.errors.length > 0) {
					parseErrorMessage = formatParseError(result.errors[0]?.message ?? 'parse_error');
				}
				else if (result.rows.length === 0) {
					parseErrorMessage = get(t)('import.payments.emptyFile');
				}
			}
		}
		catch {
			let unsupportedFormatKey = 'import.students.unsupportedFormat';
			if (isPaymentsImport) {
				unsupportedFormatKey = 'import.payments.unsupportedFormat';
			}
			else if (isBillingImport) {
				unsupportedFormatKey = 'import.billing.unsupportedFormat';
			}
			else if (isChaptersImport) {
				unsupportedFormatKey = 'import.chapters.unsupportedFormat';
			}
			else if (isSubjectsImport) {
				unsupportedFormatKey = 'import.subjects.unsupportedFormat';
			}
			else if (isTeachersImport) {
				unsupportedFormatKey = 'import.teachers.unsupportedFormat';
			}
			else if (isTeacherAssignmentsImport) {
				unsupportedFormatKey = 'import.teacherAssignments.unsupportedFormat';
			}
			else if (isStaffImport) {
				unsupportedFormatKey = 'import.staff.unsupportedFormat';
			}
			else if (isGuardiansImport) {
				unsupportedFormatKey = 'import.guardians.unsupportedFormat';
			}
			else if (isClassesImport) {
				unsupportedFormatKey = 'import.classes.unsupportedFormat';
			}
			parseErrorMessage = get(t)(unsupportedFormatKey);
		}
		finally {
			parsing = false;
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content
		class="flex max-h-[min(90vh,52rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0"
		data-testid="data-import-modal"
	>
		<div class="shrink-0 space-y-5 border-b border-border px-6 pb-4 pt-6">
			<Dialog.Header>
				<Dialog.Title>{$t('import.modalTitle')}</Dialog.Title>
				<Dialog.Description>
					{$t('import.modalDescription', { type: selectedImportTypeLabel })}
				</Dialog.Description>
			</Dialog.Header>

			<ol class="flex flex-wrap gap-2" aria-label={$t('import.modalTitle')}>
				{#each STEPS as wizardStep, index (wizardStep)}
					<li
						class={cn(
							'rounded-full border px-3 py-1 text-xs font-medium',
							stepIndex(step) === index
								? 'border-primary bg-primary/10 text-primary'
								: stepIndex(step) > index
								? 'border-border text-muted-foreground'
								: 'border-border bg-secondary/40 text-muted-foreground',
						)}
					>
						{$t(STEP_LABEL_KEYS[wizardStep])}
					</li>
				{/each}
			</ol>
		</div>

		<div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 py-4">
			{#if step === 'download'}
				<section class="space-y-4" data-testid="data-import-step-download">
					<p class="rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm text-muted-foreground">
						{$t('import.recommendedOrder')}
					</p>

					<div class="space-y-2">
						<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							{$t('import.typeSelectLabel')}
						</Label>
						<Select.Root
							type="single"
							value={selectedImportType}
							onValueChange={handleImportTypeChange}
						>
							<Select.Trigger data-testid="data-import-type-select">
								<Select.Value placeholder={$t('import.typeSelectPlaceholder')}>
									{selectedImportTypeLabel}
								</Select.Value>
							</Select.Trigger>
							<Select.Content class="z-[100]">
								{#each IMPORT_TYPE_DEFINITIONS as definition (definition.key)}
									<Select.Item value={definition.key} label={$t(definition.labelKey)}>
										<div class="flex items-center justify-between gap-3">
											<span>{$t(definition.labelKey)}</span>
											{#if definition.status === 'template_only'}
												<span class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
													{$t('import.status.templateOnly')}
												</span>
											{/if}
										</div>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					{#if showSubjectsPrerequisite}
						<p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
							{$t('import.subjects.prerequisiteMissing')}
						</p>
					{:else if showTeacherAssignmentsPrerequisite}
						<p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
							{$t('import.teacherAssignments.prerequisiteMissing')}
						</p>
					{:else if showPaymentsPrerequisite}
						<p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
							{$t('import.payments.prerequisiteMissing')}
						</p>
					{:else if showBillingStudentsPrerequisite}
						<p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
							{$t('import.billing.prerequisiteMissingStudents')}
						</p>
					{:else if showBillingFeesPrerequisite}
						<p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
							{$t('import.billing.prerequisiteMissingFees')}
						</p>
					{:else if showChaptersPrerequisite}
						<p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
							{$t('import.chapters.prerequisiteMissing')}
						</p>
					{:else if showGuardiansPrerequisite}
						<p class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
							{$t('import.guardians.prerequisiteMissing')}
						</p>
					{:else}
						<p class="text-sm text-muted-foreground">
							{showsMultiValueSeparator
								? $t(selectedDefinition.hintKey, { separator: importPreferences.multiValueSeparator })
								: $t(selectedDefinition.hintKey)}
						</p>
					{/if}

					{#if !isActiveImport}
						<p class="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
							{$t('import.comingSoon')}
						</p>
					{/if}

					<div class="flex flex-wrap items-end gap-3">
						<div class="flex flex-wrap gap-2">
							<Button
								variant="outline"
								class="justify-center"
								onclick={() => downloadImportCsvTemplate(selectedDefinition, importTemplateDownloadOptions())}
								data-testid="data-import-download-csv-template"
							>
								<Download class="mr-2 size-4" aria-hidden="true" />
								{$t('import.students.downloadCsvTemplate')}
							</Button>
							<Button
								class="justify-center"
								onclick={() => downloadImportExcelTemplate(selectedDefinition, importTemplateDownloadOptions())}
								data-testid="data-import-download-excel-template"
							>
								<FileSpreadsheet class="mr-2 size-4" aria-hidden="true" />
								{$t('import.students.downloadExcelTemplate')}
							</Button>
						</div>
						{#if showsMultiValueSeparator}
							<div class="min-w-[11rem] space-y-1.5" data-testid="data-import-multi-value-separator">
								<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
									{$t('import.multiValueSeparator.label')}
								</Label>
								<FilterSelect
									value={importPreferences.multiValueSeparator}
									onchange={(value) => {
										if (value === ';' || value === '&') {
											importPreferences.setMultiValueSeparator(value);
										}
									}}
									options={[
										{ value: ';', label: $t('import.multiValueSeparator.optionSemicolon') },
										{ value: '&', label: $t('import.multiValueSeparator.optionAmpersand') },
									]}
								/>
							</div>
						{/if}
					</div>

					<div class="rounded-xl border border-border bg-secondary/20 p-4">
						<h3 class="mb-3 text-sm font-semibold">{$t('import.students.columnsTitle')}</h3>
						<ul class="space-y-2 text-sm">
							{#each selectedDefinition.columns as column (column.key)}
								<li class="flex items-start justify-between gap-3">
									<span>{$t(column.labelKey)}</span>
									<span
										class={cn(
											'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
											column.required
												? 'bg-primary/10 text-primary'
												: 'bg-muted text-muted-foreground',
										)}
									>
										{column.required
											? $t('import.students.columnRequired')
											: $t('import.students.columnOptional')}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				</section>
			{:else if isStudentsImport && step === 'upload'}
				<section class="space-y-4" data-testid="student-import-step-upload">
					{#if showUploadDropzone}
						<p class="text-sm text-muted-foreground">{$t('import.students.uploadHint')}</p>

						<ImportFileDropzone
							disabled={parsing}
							errorMessage={parseErrorMessage}
							{selectedFileName}
							onFileSelected={handleFileSelected}
						/>
					{/if}

					{#if parsing}
						<div class="flex items-center gap-2 text-sm text-muted-foreground" data-testid="student-import-parsing">
							<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
							{$t('import.students.parsing')}
						</div>
					{:else if studentParsedRows.length > 0}
						<div class="rounded-xl border border-border bg-secondary/20 p-4" data-testid="student-import-parse-success">
							<p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
								{$t('import.students.parseSuccess', { n: studentParsedRows.length })}
							</p>

							{#if studentPreviewRows.length > 0}
								<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{$t('import.students.parseRowPreview')}
								</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each studentPreviewRows as row (row.rowIndex)}
										<li>
											<span class="font-mono text-xs text-muted-foreground">L{row.rowIndex}</span>
											<span class="mx-2">·</span>
											{row.prenom} {row.nom}
											<span class="mx-2 text-muted-foreground">·</span>
											{row.classe}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</section>
			{:else if isClassesImport && step === 'upload'}
				<section class="space-y-4" data-testid="class-import-step-upload">
					{#if showUploadDropzone}
						<p class="text-sm text-muted-foreground">{$t('import.classes.uploadHint')}</p>

						<ImportFileDropzone
							disabled={parsing}
							errorMessage={parseErrorMessage}
							{selectedFileName}
							onFileSelected={handleFileSelected}
						/>
					{/if}

					{#if parsing}
						<div class="flex items-center gap-2 text-sm text-muted-foreground" data-testid="class-import-parsing">
							<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
							{$t('import.classes.parsing')}
						</div>
					{:else if classParsedRows.length > 0}
						<div class="rounded-xl border border-border bg-secondary/20 p-4" data-testid="class-import-parse-success">
							<p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
								{$t('import.classes.parseSuccess', { n: classParsedRows.length })}
							</p>

							{#if classPreviewRows.length > 0}
								<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{$t('import.classes.parseRowPreview')}
								</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each classPreviewRows as row (row.rowIndex)}
										<li>
											<span class="font-mono text-xs text-muted-foreground">L{row.rowIndex}</span>
											<span class="mx-2">·</span>
											{row.nom}
											<span class="mx-2 text-muted-foreground">·</span>
											{row.niveau}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</section>
			{:else if isGuardiansImport && step === 'upload'}
				<section class="space-y-4" data-testid="guardian-import-step-upload">
					{#if showUploadDropzone}
						<p class="text-sm text-muted-foreground">{$t('import.guardians.uploadHint')}</p>

						<ImportFileDropzone
							disabled={parsing}
							errorMessage={parseErrorMessage}
							{selectedFileName}
							onFileSelected={handleFileSelected}
						/>
					{/if}

					{#if parsing}
						<div class="flex items-center gap-2 text-sm text-muted-foreground" data-testid="guardian-import-parsing">
							<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
							{$t('import.guardians.parsing')}
						</div>
					{:else if guardianParsedRows.length > 0}
						<div class="rounded-xl border border-border bg-secondary/20 p-4" data-testid="guardian-import-parse-success">
							<p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
								{$t('import.guardians.parseSuccess', { n: guardianParsedRows.length })}
							</p>

							{#if guardianPreviewRows.length > 0}
								<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{$t('import.guardians.parseRowPreview')}
								</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each guardianPreviewRows as row (row.rowIndex)}
										<li>
											<span class="font-mono text-xs text-muted-foreground">L{row.rowIndex}</span>
											<span class="mx-2">·</span>
											{row.prenom} {row.nom}
											<span class="mx-2 text-muted-foreground">·</span>
											{row.eleve_matricule}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</section>
			{:else if isStaffImport && step === 'upload'}
				<section class="space-y-4" data-testid="staff-import-step-upload">
					{#if showUploadDropzone}
						<p class="text-sm text-muted-foreground">{$t('import.staff.uploadHint')}</p>

						<ImportFileDropzone
							disabled={parsing}
							errorMessage={parseErrorMessage}
							{selectedFileName}
							onFileSelected={handleFileSelected}
						/>
					{/if}

					{#if parsing}
						<div class="flex items-center gap-2 text-sm text-muted-foreground" data-testid="staff-import-parsing">
							<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
							{$t('import.staff.parsing')}
						</div>
					{:else if staffParsedRows.length > 0}
						<div class="rounded-xl border border-border bg-secondary/20 p-4" data-testid="staff-import-parse-success">
							<p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
								{$t('import.staff.parseSuccess', { n: staffParsedRows.length })}
							</p>

							{#if staffPreviewRows.length > 0}
								<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{$t('import.staff.parseRowPreview')}
								</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each staffPreviewRows as row (row.rowIndex)}
										<li>
											<span class="font-mono text-xs text-muted-foreground">L{row.rowIndex}</span>
											<span class="mx-2">·</span>
											{row.prenom} {row.nom}
											<span class="mx-2 text-muted-foreground">·</span>
											{row.role}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</section>
			{:else if isTeachersImport && step === 'upload'}
				<section class="space-y-4" data-testid="teacher-import-step-upload">
					{#if showUploadDropzone}
						<p class="text-sm text-muted-foreground">{$t('import.teachers.uploadHint')}</p>

						<ImportFileDropzone
							disabled={parsing}
							errorMessage={parseErrorMessage}
							{selectedFileName}
							onFileSelected={handleFileSelected}
						/>
					{/if}

					{#if parsing}
						<div class="flex items-center gap-2 text-sm text-muted-foreground" data-testid="teacher-import-parsing">
							<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
							{$t('import.teachers.parsing')}
						</div>
					{:else if teacherParsedRows.length > 0}
						<div class="rounded-xl border border-border bg-secondary/20 p-4" data-testid="teacher-import-parse-success">
							<p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
								{$t('import.teachers.parseSuccess', { n: teacherParsedRows.length })}
							</p>

							{#if teacherPreviewRows.length > 0}
								<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{$t('import.teachers.parseRowPreview')}
								</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each teacherPreviewRows as row (row.rowIndex)}
										<li>
											<span class="font-mono text-xs text-muted-foreground">L{row.rowIndex}</span>
											<span class="mx-2">·</span>
											{row.prenom} {row.nom}
											{#if row.email?.trim()}
												<span class="mx-2 text-muted-foreground">·</span>
												{row.email}
											{:else if row.telephone?.trim()}
												<span class="mx-2 text-muted-foreground">·</span>
												{row.telephone}
											{/if}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</section>
			{:else if isTeacherAssignmentsImport && step === 'upload'}
				<section class="space-y-4" data-testid="teacher-assignment-import-step-upload">
					{#if showUploadDropzone}
						<p class="text-sm text-muted-foreground">{$t('import.teacherAssignments.uploadHint')}</p>

						<ImportFileDropzone
							disabled={parsing}
							errorMessage={parseErrorMessage}
							{selectedFileName}
							onFileSelected={handleFileSelected}
						/>
					{/if}

					{#if parsing}
						<div class="flex items-center gap-2 text-sm text-muted-foreground" data-testid="teacher-assignment-import-parsing">
							<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
							{$t('import.teacherAssignments.parsing')}
						</div>
					{:else if teacherAssignmentParsedRows.length > 0}
						<div class="rounded-xl border border-border bg-secondary/20 p-4" data-testid="teacher-assignment-import-parse-success">
							<p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
								{$t('import.teacherAssignments.parseSuccess', { n: teacherAssignmentParsedRows.length })}
							</p>

							{#if teacherAssignmentPreviewRows.length > 0}
								<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{$t('import.teacherAssignments.parseRowPreview')}
								</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each teacherAssignmentPreviewRows as row (row.rowIndex)}
										<li>
											<span class="font-mono text-xs text-muted-foreground">L{row.rowIndex}</span>
											<span class="mx-2">·</span>
											{row.code}
											<span class="mx-2 text-muted-foreground">·</span>
											{row.classe}
											<span class="mx-2 text-muted-foreground">·</span>
											{row.matiere}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</section>
			{:else if isSubjectsImport && step === 'upload'}
				<section class="space-y-4" data-testid="subject-import-step-upload">
					{#if showUploadDropzone}
						<p class="text-sm text-muted-foreground">{$t('import.subjects.uploadHint')}</p>

						<ImportFileDropzone
							disabled={parsing}
							errorMessage={parseErrorMessage}
							{selectedFileName}
							onFileSelected={handleFileSelected}
						/>
					{/if}

					{#if parsing}
						<div class="flex items-center gap-2 text-sm text-muted-foreground" data-testid="subject-import-parsing">
							<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
							{$t('import.subjects.parsing')}
						</div>
					{:else if subjectParsedRows.length > 0}
						<div class="rounded-xl border border-border bg-secondary/20 p-4" data-testid="subject-import-parse-success">
							<p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
								{$t('import.subjects.parseSuccess', { n: subjectParsedRows.length })}
							</p>

							{#if subjectPreviewRows.length > 0}
								<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{$t('import.subjects.parseRowPreview')}
								</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each subjectPreviewRows as row (row.rowIndex)}
										<li>
											<span class="font-mono text-xs text-muted-foreground">L{row.rowIndex}</span>
											<span class="mx-2">·</span>
											{row.nom}
											<span class="mx-2 text-muted-foreground">·</span>
											{row.niveau}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</section>
			{:else if isChaptersImport && step === 'upload'}
				<section class="space-y-4" data-testid="chapter-import-step-upload">
					{#if showUploadDropzone}
						<p class="text-sm text-muted-foreground">{$t('import.chapters.uploadHint')}</p>

						<ImportFileDropzone
							disabled={parsing}
							errorMessage={parseErrorMessage}
							{selectedFileName}
							onFileSelected={handleFileSelected}
						/>
					{/if}

					{#if parsing}
						<div class="flex items-center gap-2 text-sm text-muted-foreground" data-testid="chapter-import-parsing">
							<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
							{$t('import.chapters.parsing')}
						</div>
					{:else if chapterParsedRows.length > 0}
						<div class="rounded-xl border border-border bg-secondary/20 p-4" data-testid="chapter-import-parse-success">
							<p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
								{$t('import.chapters.parseSuccess', { n: chapterParsedRows.length })}
							</p>

							{#if chapterPreviewRows.length > 0}
								<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{$t('import.chapters.parseRowPreview')}
								</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each chapterPreviewRows as row (row.rowIndex)}
										<li>
											<span class="font-mono text-xs text-muted-foreground">L{row.rowIndex}</span>
											<span class="mx-2">·</span>
											{row.niveau}
											<span class="mx-2 text-muted-foreground">·</span>
											{row.matiere}
											<span class="mx-2 text-muted-foreground">·</span>
											{row.titre}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</section>
			{:else if isBillingImport && step === 'upload'}
				<section class="space-y-4" data-testid="billing-import-step-upload">
					{#if showUploadDropzone}
						<p class="text-sm text-muted-foreground">{$t('import.billing.uploadHint')}</p>

						<ImportFileDropzone
							disabled={parsing}
							errorMessage={parseErrorMessage}
							{selectedFileName}
							onFileSelected={handleFileSelected}
						/>
					{/if}

					{#if parsing}
						<div class="flex items-center gap-2 text-sm text-muted-foreground" data-testid="billing-import-parsing">
							<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
							{$t('import.billing.parsing')}
						</div>
					{:else if billingParsedRows.length > 0}
						<div class="rounded-xl border border-border bg-secondary/20 p-4" data-testid="billing-import-parse-success">
							<p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
								{$t('import.billing.parseSuccess', { n: billingParsedRows.length })}
							</p>

							{#if billingPreviewRows.length > 0}
								<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{$t('import.billing.parseRowPreview')}
								</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each billingPreviewRows as row (row.rowIndex)}
										<li>
											<span class="font-mono text-xs text-muted-foreground">L{row.rowIndex}</span>
											<span class="mx-2">·</span>
											{row.matricule}
											<span class="mx-2 text-muted-foreground">·</span>
											{row.type_frais}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</section>
			{:else if isPaymentsImport && step === 'upload'}
				<section class="space-y-4" data-testid="payment-import-step-upload">
					{#if showUploadDropzone}
						<p class="text-sm text-muted-foreground">{$t('import.payments.uploadHint')}</p>

						<ImportFileDropzone
							disabled={parsing}
							errorMessage={parseErrorMessage}
							{selectedFileName}
							onFileSelected={handleFileSelected}
						/>
					{/if}

					{#if parsing}
						<div class="flex items-center gap-2 text-sm text-muted-foreground" data-testid="payment-import-parsing">
							<LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
							{$t('import.payments.parsing')}
						</div>
					{:else if paymentParsedRows.length > 0}
						<div class="rounded-xl border border-border bg-secondary/20 p-4" data-testid="payment-import-parse-success">
							<p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
								{$t('import.payments.parseSuccess', { n: paymentParsedRows.length })}
							</p>

							{#if paymentPreviewRows.length > 0}
								<p class="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{$t('import.payments.parseRowPreview')}
								</p>
								<ul class="mt-2 space-y-1 text-sm">
									{#each paymentPreviewRows as row (row.rowIndex)}
										<li>
											<span class="font-mono text-xs text-muted-foreground">L{row.rowIndex}</span>
											<span class="mx-2">·</span>
											{row.matricule}
											<span class="mx-2 text-muted-foreground">·</span>
											{row.type_frais}
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</section>
			{:else if isStudentsImport && step === 'validate' && studentValidationResult}
				<section class="space-y-4" data-testid="student-import-step-validate">
					<ImportValidationSummary
						readyCount={studentValidationResult.validRows.length}
						errorCount={studentValidationResult.errors.length}
						warningCount={studentValidationResult.warnings.length}
						readyLabelKey="import.students.validation.summaryReady"
						errorLabelKey="import.students.validation.summaryErrors"
						warningLabelKey="import.students.validation.summaryWarnings"
					/>

					<ImportValidationTable
						issues={studentValidationIssues}
						columnLabelKeys={STUDENT_COLUMN_LABEL_KEYS}
					/>

					<ImportReportDownload
						definition={selectedDefinition}
						rows={studentParsedRows}
						errors={studentValidationResult.errors}
						warnings={studentValidationResult.warnings}
						validRowIndexes={new Set(studentValidationResult.validRows.map(row => row.rowIndex))}
						phase="validate"
						filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
					/>
				</section>
			{:else if isClassesImport && step === 'validate' && classValidationResult}
				<section class="space-y-4" data-testid="class-import-step-validate">
					<ImportValidationSummary
						readyCount={classValidationResult.validRows.length}
						errorCount={classValidationResult.errors.length}
						warningCount={classValidationResult.warnings.length}
						readyLabelKey="import.classes.validation.summaryReady"
						errorLabelKey="import.classes.validation.summaryErrors"
						warningLabelKey="import.classes.validation.summaryWarnings"
					/>

					<ImportValidationTable
						issues={classValidationIssues}
						columnLabelKeys={CLASS_COLUMN_LABEL_KEYS}
						suggestionsKey="import.classes.validation.suggestions"
					/>

					<ImportReportDownload
						definition={selectedDefinition}
						rows={classParsedRows}
						errors={classValidationResult.errors}
						warnings={classValidationResult.warnings}
						validRowIndexes={new Set(classValidationResult.validRows.map(row => row.rowIndex))}
						phase="validate"
						suggestionsKey="import.classes.validation.suggestions"
						filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
					/>
				</section>
			{:else if isGuardiansImport && step === 'validate' && guardianValidationResult}
				<section class="space-y-4" data-testid="guardian-import-step-validate">
					<ImportValidationSummary
						readyCount={guardianValidationResult.validRows.length}
						errorCount={guardianValidationResult.errors.length}
						warningCount={guardianValidationResult.warnings.length}
						readyLabelKey="import.guardians.validation.summaryReady"
						errorLabelKey="import.guardians.validation.summaryErrors"
						warningLabelKey="import.guardians.validation.summaryWarnings"
					/>

					<ImportValidationTable
						issues={guardianValidationIssues}
						columnLabelKeys={GUARDIAN_COLUMN_LABEL_KEYS}
						suggestionsKey="import.guardians.validation.suggestions"
					/>

					<ImportReportDownload
						definition={selectedDefinition}
						rows={guardianParsedRows}
						errors={guardianValidationResult.errors}
						warnings={guardianValidationResult.warnings}
						validRowIndexes={new Set(guardianValidationResult.validRows.map(row => row.rowIndex))}
						phase="validate"
						suggestionsKey="import.guardians.validation.suggestions"
						filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
					/>
				</section>
			{:else if isStaffImport && step === 'validate' && staffValidationResult}
				<section class="space-y-4" data-testid="staff-import-step-validate">
					<ImportValidationSummary
						readyCount={staffValidationResult.validRows.length}
						errorCount={staffValidationResult.errors.length}
						warningCount={staffValidationResult.warnings.length}
						readyLabelKey="import.staff.validation.summaryReady"
						errorLabelKey="import.staff.validation.summaryErrors"
						warningLabelKey="import.staff.validation.summaryWarnings"
					/>

					<ImportValidationTable
						issues={staffValidationIssues}
						columnLabelKeys={STAFF_COLUMN_LABEL_KEYS}
						suggestionsKey="import.staff.validation.suggestions"
					/>

					<ImportReportDownload
						definition={selectedDefinition}
						rows={staffParsedRows}
						errors={staffValidationResult.errors}
						warnings={staffValidationResult.warnings}
						validRowIndexes={new Set(staffValidationResult.validRows.map(row => row.rowIndex))}
						phase="validate"
						suggestionsKey="import.staff.validation.suggestions"
						filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
					/>
				</section>
			{:else if isTeachersImport && step === 'validate' && teacherValidationResult}
				<section class="space-y-4" data-testid="teacher-import-step-validate">
					<ImportValidationSummary
						readyCount={teacherValidationResult.validRows.length}
						errorCount={teacherValidationResult.errors.length}
						warningCount={teacherValidationResult.warnings.length}
						readyLabelKey="import.teachers.validation.summaryReady"
						errorLabelKey="import.teachers.validation.summaryErrors"
						warningLabelKey="import.teachers.validation.summaryWarnings"
					/>

					<ImportValidationTable
						issues={teacherValidationIssues}
						columnLabelKeys={TEACHER_COLUMN_LABEL_KEYS}
						suggestionsKey="import.teachers.validation.suggestions"
					/>

					<ImportReportDownload
						definition={selectedDefinition}
						rows={teacherParsedRows}
						errors={teacherValidationResult.errors}
						warnings={teacherValidationResult.warnings}
						validRowIndexes={new Set(teacherValidationResult.validRows.map(row => row.rowIndex))}
						phase="validate"
						suggestionsKey="import.teachers.validation.suggestions"
						filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
					/>
				</section>
			{:else if isTeacherAssignmentsImport && step === 'validate' && teacherAssignmentValidationResult}
				<section class="space-y-4" data-testid="teacher-assignment-import-step-validate">
					<ImportValidationSummary
						readyCount={teacherAssignmentValidationResult.validRows.length}
						errorCount={teacherAssignmentValidationResult.errors.length}
						warningCount={teacherAssignmentValidationResult.warnings.length}
						readyLabelKey="import.teacherAssignments.validation.summaryReady"
						errorLabelKey="import.teacherAssignments.validation.summaryErrors"
						warningLabelKey="import.teacherAssignments.validation.summaryWarnings"
					/>

					<ImportValidationTable
						issues={teacherAssignmentValidationIssues}
						columnLabelKeys={TEACHER_ASSIGNMENT_COLUMN_LABEL_KEYS}
						suggestionsKey="import.teacherAssignments.validation.suggestions"
					/>

					<ImportReportDownload
						definition={selectedDefinition}
						rows={teacherAssignmentParsedRows}
						errors={teacherAssignmentValidationResult.errors}
						warnings={teacherAssignmentValidationResult.warnings}
						validRowIndexes={new Set(teacherAssignmentValidationResult.validRows.map(row => row.rowIndex))}
						phase="validate"
						suggestionsKey="import.teacherAssignments.validation.suggestions"
						filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
					/>
				</section>
			{:else if isSubjectsImport && step === 'validate' && subjectValidationResult}
				<section class="space-y-4" data-testid="subject-import-step-validate">
					<ImportValidationSummary
						readyCount={subjectValidationResult.validRows.length}
						errorCount={subjectValidationResult.errors.length}
						warningCount={subjectValidationResult.warnings.length}
						readyLabelKey="import.subjects.validation.summaryReady"
						errorLabelKey="import.subjects.validation.summaryErrors"
						warningLabelKey="import.subjects.validation.summaryWarnings"
					/>

					<ImportValidationTable
						issues={subjectValidationIssues}
						columnLabelKeys={SUBJECT_COLUMN_LABEL_KEYS}
						suggestionsKey="import.subjects.validation.suggestions"
					/>

					<ImportReportDownload
						definition={selectedDefinition}
						rows={subjectParsedRows}
						errors={subjectValidationResult.errors}
						warnings={subjectValidationResult.warnings}
						validRowIndexes={new Set(subjectValidationResult.validRows.map(row => row.rowIndex))}
						phase="validate"
						suggestionsKey="import.subjects.validation.suggestions"
						filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
					/>
				</section>
			{:else if isChaptersImport && step === 'validate' && chapterValidationResult}
				<section class="space-y-4" data-testid="chapter-import-step-validate">
					<ImportValidationSummary
						readyCount={chapterValidationResult.validRows.length}
						errorCount={chapterValidationResult.errors.length}
						warningCount={chapterValidationResult.warnings.length}
						readyLabelKey="import.chapters.validation.summaryReady"
						errorLabelKey="import.chapters.validation.summaryErrors"
						warningLabelKey="import.chapters.validation.summaryWarnings"
					/>

					<ImportValidationTable
						issues={chapterValidationIssues}
						columnLabelKeys={CHAPTER_COLUMN_LABEL_KEYS}
						suggestionsKey="import.chapters.validation.suggestions"
					/>

					<ImportReportDownload
						definition={selectedDefinition}
						rows={chapterParsedRows}
						errors={chapterValidationResult.errors}
						warnings={chapterValidationResult.warnings}
						validRowIndexes={new Set(chapterValidationResult.validRows.map(row => row.rowIndex))}
						phase="validate"
						suggestionsKey="import.chapters.validation.suggestions"
						filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
					/>
				</section>
			{:else if isBillingImport && step === 'validate' && billingValidationResult}
				<section class="space-y-4" data-testid="billing-import-step-validate">
					<ImportValidationSummary
						readyCount={billingValidationResult.validRows.length}
						errorCount={billingValidationResult.errors.length}
						warningCount={billingValidationResult.warnings.length}
						readyLabelKey="import.billing.validation.summaryReady"
						errorLabelKey="import.billing.validation.summaryErrors"
						warningLabelKey="import.billing.validation.summaryWarnings"
					/>

					<ImportValidationTable
						issues={billingValidationIssues}
						columnLabelKeys={BILLING_COLUMN_LABEL_KEYS}
						suggestionsKey="import.billing.validation.suggestions"
					/>

					<ImportReportDownload
						definition={selectedDefinition}
						rows={billingParsedRows}
						errors={billingValidationResult.errors}
						warnings={billingValidationResult.warnings}
						validRowIndexes={new Set(billingValidationResult.validRows.map(row => row.rowIndex))}
						phase="validate"
						suggestionsKey="import.billing.validation.suggestions"
						filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
					/>
				</section>
			{:else if isPaymentsImport && step === 'validate' && paymentValidationResult}
				<section class="space-y-4" data-testid="payment-import-step-validate">
					<ImportValidationSummary
						readyCount={paymentValidationResult.validRows.length}
						errorCount={paymentValidationResult.errors.length}
						warningCount={paymentValidationResult.warnings.length}
						readyLabelKey="import.payments.validation.summaryReady"
						errorLabelKey="import.payments.validation.summaryErrors"
						warningLabelKey="import.payments.validation.summaryWarnings"
					/>

					<ImportValidationTable
						issues={paymentValidationIssues}
						columnLabelKeys={PAYMENT_COLUMN_LABEL_KEYS}
						suggestionsKey="import.payments.validation.suggestions"
					/>

					<ImportReportDownload
						definition={selectedDefinition}
						rows={paymentParsedRows}
						errors={paymentValidationResult.errors}
						warnings={paymentValidationResult.warnings}
						validRowIndexes={new Set(paymentValidationResult.validRows.map(row => row.rowIndex))}
						phase="validate"
						suggestionsKey="import.payments.validation.suggestions"
						filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
					/>
				</section>
			{:else if isStudentsImport && step === 'execute'}
				<section class="space-y-4" data-testid="student-import-step-execute">
					{#if importing}
						<p class="text-sm text-muted-foreground">{$t('import.students.executing')}</p>
						<ImportProgressBar
							current={importProgress.current}
							total={importProgress.total}
							label={$t('import.students.executeProgress', {
								current: importProgress.current,
								total: importProgress.total,
							})}
						/>
					{:else if studentImportResult}
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">{$t('import.students.resultTitle')}</h3>
							{#if importFatalError}
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{importFatalError}
								</p>
							{/if}
							<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
								<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
									{$t('import.students.resultCreated', { n: studentImportResult.created })}
								</p>
								<p
									class={cn(
										'rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
										studentBlockedValidationCount === 0 && 'opacity-60',
									)}
								>
									{$t('import.students.resultBlocked', { n: studentBlockedValidationCount })}
								</p>
								<p
									class={cn(
										'rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100',
										studentImportResult.warnings.length === 0 && 'opacity-60',
									)}
								>
									{$t('import.students.resultWarnings', { n: studentImportResult.warnings.length })}
								</p>
								<p
									class={cn(
										'rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
										studentImportResult.failed.length === 0 && 'opacity-60',
									)}
								>
									{$t('import.students.resultFailed', { n: studentImportResult.failed.length })}
								</p>
							</div>

							{#if studentImportResult.created === 0 && studentBlockedValidationCount === 0 && studentImportResult.failed.length === 0 && !importFatalError}
								<p class="text-sm text-muted-foreground">{$t('import.students.resultNothing')}</p>
							{/if}

							{#if studentBlockedValidationCount > 0 && studentValidationResult}
								<div class="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
									<p class="text-sm font-semibold text-destructive">
										{$t('import.students.resultBlockedList')}
									</p>
									<ImportValidationTable
										issues={studentValidationResult.errors}
										columnLabelKeys={STUDENT_COLUMN_LABEL_KEYS}
									/>
								</div>
							{/if}

							{#if studentImportResult.warnings.length > 0}
								<div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
									<p class="mb-2 text-sm font-semibold text-amber-950 dark:text-amber-50">
										{$t('import.students.resultWarningsList')}
									</p>
									<ul class="space-y-2 text-sm text-amber-950 dark:text-amber-50">
										{#each studentImportResult.warnings as warning (warning.rowIndex + warning.studentName)}
											<li>
												<span class="font-mono text-xs opacity-80">L{warning.rowIndex}</span>
												<span class="mx-2">·</span>
												{warning.studentName}
												<span class="mx-2 opacity-80">—</span>
												{warning.message}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if studentImportResult.failed.length > 0}
								<div class="rounded-xl border border-border bg-secondary/20 p-4">
									<p class="mb-2 text-sm font-semibold">{$t('import.students.resultFailures')}</p>
									<ul class="space-y-2 text-sm">
										{#each studentImportResult.failed as failure (failure.rowIndex + failure.studentName)}
											<li>
												<span class="font-mono text-xs text-muted-foreground">L{failure.rowIndex}</span>
												<span class="mx-2">·</span>
												{failure.studentName}
												<span class="mx-2 text-muted-foreground">—</span>
												{failure.message}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if studentValidationResult}
								<ImportReportDownload
									definition={selectedDefinition}
									rows={studentParsedRows}
									errors={studentValidationResult.errors}
									warnings={studentValidationResult.warnings}
									validRowIndexes={new Set(studentValidationResult.validRows.map(row => row.rowIndex))}
									importFailures={studentImportResult.failed.map(failure => ({
										rowIndex: failure.rowIndex,
										message: failure.message,
									}))}
									importWarnings={studentImportResult.warnings.map(warning => ({
										rowIndex: warning.rowIndex,
										message: warning.message,
									}))}
									phase="execute"
									filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
								/>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">{$t('import.students.resultUnexpected')}</p>
					{/if}
				</section>
			{:else if isClassesImport && step === 'execute'}
				<section class="space-y-4" data-testid="class-import-step-execute">
					{#if importing}
						<p class="text-sm text-muted-foreground">{$t('import.classes.executing')}</p>
						<ImportProgressBar
							current={importProgress.current}
							total={importProgress.total}
							label={$t('import.classes.executeProgress', {
								current: importProgress.current,
								total: importProgress.total,
							})}
						/>
					{:else if classImportResult}
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">{$t('import.classes.resultTitle')}</h3>
							{#if importFatalError}
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{importFatalError}
								</p>
							{/if}
							<div class="grid gap-2 sm:grid-cols-2">
								<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
									{$t('import.classes.resultCreated', { n: classImportResult.created })}
								</p>
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{$t('import.classes.resultFailed', { n: classImportResult.failed.length })}
								</p>
							</div>

							{#if classImportResult.created === 0 && classImportResult.failed.length === 0 && !importFatalError}
								<p class="text-sm text-muted-foreground">{$t('import.classes.resultNothing')}</p>
							{/if}

							{#if classImportResult.failed.length > 0}
								<div class="rounded-xl border border-border bg-secondary/20 p-4">
									<p class="mb-2 text-sm font-semibold">{$t('import.classes.resultFailures')}</p>
									<ul class="space-y-2 text-sm">
										{#each classImportResult.failed as failure (failure.rowIndex + failure.className)}
											<li>
												<span class="font-mono text-xs text-muted-foreground">L{failure.rowIndex}</span>
												<span class="mx-2">·</span>
												{failure.className}
												<span class="mx-2 text-muted-foreground">—</span>
												{failure.message}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if classValidationResult}
								<ImportReportDownload
									definition={selectedDefinition}
									rows={classParsedRows}
									errors={classValidationResult.errors}
									warnings={classValidationResult.warnings}
									validRowIndexes={new Set(classValidationResult.validRows.map(row => row.rowIndex))}
									importFailures={classImportResult.failed.map(failure => ({
										rowIndex: failure.rowIndex,
										message: failure.message,
									}))}
									phase="execute"
									suggestionsKey="import.classes.validation.suggestions"
									filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
								/>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">{$t('import.classes.resultUnexpected')}</p>
					{/if}
				</section>
			{:else if isGuardiansImport && step === 'execute'}
				<section class="space-y-4" data-testid="guardian-import-step-execute">
					{#if importing}
						<p class="text-sm text-muted-foreground">{$t('import.guardians.executing')}</p>
						<ImportProgressBar
							current={importProgress.current}
							total={importProgress.total}
							label={$t('import.guardians.executeProgress', {
								current: importProgress.current,
								total: importProgress.total,
							})}
						/>
					{:else if guardianImportResult}
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">{$t('import.guardians.resultTitle')}</h3>
							{#if importFatalError}
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{importFatalError}
								</p>
							{/if}
							<div class="grid gap-2 sm:grid-cols-2">
								<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
									{$t('import.guardians.resultCreated', { n: guardianImportResult.created })}
								</p>
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{$t('import.guardians.resultFailed', { n: guardianImportResult.failed.length })}
								</p>
							</div>

							{#if guardianImportResult.created === 0 && guardianImportResult.failed.length === 0 && !importFatalError}
								<p class="text-sm text-muted-foreground">{$t('import.guardians.resultNothing')}</p>
							{/if}

							{#if guardianImportResult.failed.length > 0}
								<div class="rounded-xl border border-border bg-secondary/20 p-4">
									<p class="mb-2 text-sm font-semibold">{$t('import.guardians.resultFailures')}</p>
									<ul class="space-y-2 text-sm">
										{#each guardianImportResult.failed as failure (failure.rowIndex + failure.guardianName)}
											<li>
												<span class="font-mono text-xs text-muted-foreground">L{failure.rowIndex}</span>
												<span class="mx-2">·</span>
												{failure.guardianName}
												<span class="mx-2 text-muted-foreground">—</span>
												{failure.message}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if guardianValidationResult}
								<ImportReportDownload
									definition={selectedDefinition}
									rows={guardianParsedRows}
									errors={guardianValidationResult.errors}
									warnings={guardianValidationResult.warnings}
									validRowIndexes={new Set(guardianValidationResult.validRows.map(row => row.rowIndex))}
									importFailures={guardianImportResult.failed.map(failure => ({
										rowIndex: failure.rowIndex,
										message: failure.message,
									}))}
									phase="execute"
									suggestionsKey="import.guardians.validation.suggestions"
									filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
								/>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">{$t('import.guardians.resultUnexpected')}</p>
					{/if}
				</section>
			{:else if isStaffImport && step === 'execute'}
				<section class="space-y-4" data-testid="staff-import-step-execute">
					{#if importing}
						<p class="text-sm text-muted-foreground">{$t('import.staff.executing')}</p>
						<ImportProgressBar
							current={importProgress.current}
							total={importProgress.total}
							label={$t('import.staff.executeProgress', {
								current: importProgress.current,
								total: importProgress.total,
							})}
						/>
					{:else if staffImportResult}
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">{$t('import.staff.resultTitle')}</h3>
							{#if importFatalError}
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{importFatalError}
								</p>
							{/if}
							<div class="grid gap-2 sm:grid-cols-2">
								<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
									{$t('import.staff.resultCreated', { n: staffImportResult.created })}
								</p>
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{$t('import.staff.resultFailed', { n: staffImportResult.failed.length })}
								</p>
							</div>

							{#if staffImportResult.created === 0 && staffImportResult.failed.length === 0 && !importFatalError}
								<p class="text-sm text-muted-foreground">{$t('import.staff.resultNothing')}</p>
							{/if}

							{#if staffImportResult.failed.length > 0}
								<div class="rounded-xl border border-border bg-secondary/20 p-4">
									<p class="mb-2 text-sm font-semibold">{$t('import.staff.resultFailures')}</p>
									<ul class="space-y-2 text-sm">
										{#each staffImportResult.failed as failure (failure.rowIndex + failure.staffName)}
											<li>
												<span class="font-mono text-xs text-muted-foreground">L{failure.rowIndex}</span>
												<span class="mx-2">·</span>
												{failure.staffName}
												<span class="mx-2 text-muted-foreground">—</span>
												{failure.message}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if staffValidationResult}
								<ImportReportDownload
									definition={selectedDefinition}
									rows={staffParsedRows}
									errors={staffValidationResult.errors}
									warnings={staffValidationResult.warnings}
									validRowIndexes={new Set(staffValidationResult.validRows.map(row => row.rowIndex))}
									importFailures={staffImportResult.failed.map(failure => ({
										rowIndex: failure.rowIndex,
										message: failure.message,
									}))}
									phase="execute"
									suggestionsKey="import.staff.validation.suggestions"
									filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
								/>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">{$t('import.staff.resultUnexpected')}</p>
					{/if}
				</section>
			{:else if isTeachersImport && step === 'execute'}
				<section class="space-y-4" data-testid="teacher-import-step-execute">
					{#if importing}
						<p class="text-sm text-muted-foreground">{$t('import.teachers.executing')}</p>
						<ImportProgressBar
							current={importProgress.current}
							total={importProgress.total}
							label={$t('import.teachers.executeProgress', {
								current: importProgress.current,
								total: importProgress.total,
							})}
						/>
					{:else if teacherImportResult}
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">{$t('import.teachers.resultTitle')}</h3>
							{#if importFatalError}
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{importFatalError}
								</p>
							{/if}
							<div class="grid gap-2 sm:grid-cols-2">
								<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
									{$t('import.teachers.resultCreated', { n: teacherImportResult.created })}
								</p>
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{$t('import.teachers.resultFailed', { n: teacherImportResult.failed.length })}
								</p>
							</div>

							{#if teacherImportResult.created === 0 && teacherImportResult.failed.length === 0 && !importFatalError}
								<p class="text-sm text-muted-foreground">{$t('import.teachers.resultNothing')}</p>
							{/if}

							{#if teacherImportResult.failed.length > 0}
								<div class="rounded-xl border border-border bg-secondary/20 p-4">
									<p class="mb-2 text-sm font-semibold">{$t('import.teachers.resultFailures')}</p>
									<ul class="space-y-2 text-sm">
										{#each teacherImportResult.failed as failure (failure.rowIndex + failure.teacherName)}
											<li>
												<span class="font-mono text-xs text-muted-foreground">L{failure.rowIndex}</span>
												<span class="mx-2">·</span>
												{failure.teacherName}
												<span class="mx-2 text-muted-foreground">—</span>
												{failure.message}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if teacherValidationResult}
								<ImportReportDownload
									definition={selectedDefinition}
									rows={teacherParsedRows}
									errors={teacherValidationResult.errors}
									warnings={teacherValidationResult.warnings}
									validRowIndexes={new Set(teacherValidationResult.validRows.map(row => row.rowIndex))}
									importFailures={teacherImportResult.failed.map(failure => ({
										rowIndex: failure.rowIndex,
										message: failure.message,
									}))}
									phase="execute"
									suggestionsKey="import.teachers.validation.suggestions"
									filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
								/>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">{$t('import.teachers.resultUnexpected')}</p>
					{/if}
				</section>
			{:else if isTeacherAssignmentsImport && step === 'execute'}
				<section class="space-y-4" data-testid="teacher-assignment-import-step-execute">
					{#if importing}
						<p class="text-sm text-muted-foreground">{$t('import.teacherAssignments.executing')}</p>
						<ImportProgressBar
							current={importProgress.current}
							total={importProgress.total}
							label={$t('import.teacherAssignments.executeProgress', {
								current: importProgress.current,
								total: importProgress.total,
							})}
						/>
					{:else if teacherAssignmentImportResult}
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">{$t('import.teacherAssignments.resultTitle')}</h3>
							{#if importFatalError}
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{importFatalError}
								</p>
							{/if}
							<div class="grid gap-2 sm:grid-cols-2">
								<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
									{$t('import.teacherAssignments.resultCreated', { n: teacherAssignmentImportResult.created })}
								</p>
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{$t('import.teacherAssignments.resultFailed', { n: teacherAssignmentImportResult.failed.length })}
								</p>
							</div>

							{#if teacherAssignmentImportResult.created === 0 && teacherAssignmentImportResult.failed.length === 0 && !importFatalError}
								<p class="text-sm text-muted-foreground">{$t('import.teacherAssignments.resultNothing')}</p>
							{/if}

							{#if teacherAssignmentImportResult.failed.length > 0}
								<div class="rounded-xl border border-border bg-secondary/20 p-4">
									<p class="mb-2 text-sm font-semibold">{$t('import.teacherAssignments.resultFailures')}</p>
									<ul class="space-y-2 text-sm">
										{#each teacherAssignmentImportResult.failed as failure (failure.rowIndex + failure.label)}
											<li>
												<span class="font-mono text-xs text-muted-foreground">L{failure.rowIndex}</span>
												<span class="mx-2">·</span>
												{failure.label}
												<span class="mx-2 text-muted-foreground">—</span>
												{failure.message}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if teacherAssignmentValidationResult}
								<ImportReportDownload
									definition={selectedDefinition}
									rows={teacherAssignmentParsedRows}
									errors={teacherAssignmentValidationResult.errors}
									warnings={teacherAssignmentValidationResult.warnings}
									validRowIndexes={new Set(teacherAssignmentValidationResult.validRows.map(row => row.rowIndex))}
									importFailures={teacherAssignmentImportResult.failed.map(failure => ({
										rowIndex: failure.rowIndex,
										message: failure.message,
									}))}
									phase="execute"
									suggestionsKey="import.teacherAssignments.validation.suggestions"
									filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
								/>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">{$t('import.teacherAssignments.resultUnexpected')}</p>
					{/if}
				</section>
			{:else if isSubjectsImport && step === 'execute'}
				<section class="space-y-4" data-testid="subject-import-step-execute">
					{#if importing}
						<p class="text-sm text-muted-foreground">{$t('import.subjects.executing')}</p>
						<ImportProgressBar
							current={importProgress.current}
							total={importProgress.total}
							label={$t('import.subjects.executeProgress', {
								current: importProgress.current,
								total: importProgress.total,
							})}
						/>
					{:else if subjectImportResult}
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">{$t('import.subjects.resultTitle')}</h3>
							{#if importFatalError}
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{importFatalError}
								</p>
							{/if}
							<div class="grid gap-2 sm:grid-cols-2">
								<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
									{$t('import.subjects.resultCreated', { n: subjectImportResult.created })}
								</p>
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{$t('import.subjects.resultFailed', { n: subjectImportResult.failed.length })}
								</p>
							</div>

							{#if subjectImportResult.created === 0 && subjectImportResult.failed.length === 0 && !importFatalError}
								<p class="text-sm text-muted-foreground">{$t('import.subjects.resultNothing')}</p>
							{/if}

							{#if subjectImportResult.failed.length > 0}
								<div class="rounded-xl border border-border bg-secondary/20 p-4">
									<p class="mb-2 text-sm font-semibold">{$t('import.subjects.resultFailures')}</p>
									<ul class="space-y-2 text-sm">
										{#each subjectImportResult.failed as failure (failure.rowIndex + failure.subjectName)}
											<li>
												<span class="font-mono text-xs text-muted-foreground">L{failure.rowIndex}</span>
												<span class="mx-2">·</span>
												{failure.subjectName}
												<span class="mx-2 text-muted-foreground">—</span>
												{failure.message}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if subjectValidationResult}
								<ImportReportDownload
									definition={selectedDefinition}
									rows={subjectParsedRows}
									errors={subjectValidationResult.errors}
									warnings={subjectValidationResult.warnings}
									validRowIndexes={new Set(subjectValidationResult.validRows.map(row => row.rowIndex))}
									importFailures={subjectImportResult.failed.map(failure => ({
										rowIndex: failure.rowIndex,
										message: failure.message,
									}))}
									phase="execute"
									suggestionsKey="import.subjects.validation.suggestions"
									filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
								/>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">{$t('import.subjects.resultUnexpected')}</p>
					{/if}
				</section>
			{:else if isChaptersImport && step === 'execute'}
				<section class="space-y-4" data-testid="chapter-import-step-execute">
					{#if importing}
						<p class="text-sm text-muted-foreground">{$t('import.chapters.executing')}</p>
						<ImportProgressBar
							current={importProgress.current}
							total={importProgress.total}
							label={$t('import.chapters.executeProgress', {
								current: importProgress.current,
								total: importProgress.total,
							})}
						/>
					{:else if chapterImportResult}
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">{$t('import.chapters.resultTitle')}</h3>
							{#if importFatalError}
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{importFatalError}
								</p>
							{/if}
							<div class="grid gap-2 sm:grid-cols-2">
								<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
									{$t('import.chapters.resultCreated', { n: chapterImportResult.created })}
								</p>
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{$t('import.chapters.resultFailed', { n: chapterImportResult.failed.length })}
								</p>
							</div>

							{#if chapterImportResult.created === 0 && chapterImportResult.failed.length === 0 && !importFatalError}
								<p class="text-sm text-muted-foreground">{$t('import.chapters.resultNothing')}</p>
							{/if}

							{#if chapterImportResult.failed.length > 0}
								<div class="rounded-xl border border-border bg-secondary/20 p-4">
									<p class="mb-2 text-sm font-semibold">{$t('import.chapters.resultFailures')}</p>
									<ul class="space-y-2 text-sm">
										{#each chapterImportResult.failed as failure (failure.rowIndex + failure.chapterLabel)}
											<li>
												<span class="font-mono text-xs text-muted-foreground">L{failure.rowIndex}</span>
												<span class="mx-2">·</span>
												{failure.chapterLabel}
												<span class="mx-2 text-muted-foreground">—</span>
												{failure.message}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if chapterValidationResult}
								<ImportReportDownload
									definition={selectedDefinition}
									rows={chapterParsedRows}
									errors={chapterValidationResult.errors}
									warnings={chapterValidationResult.warnings}
									validRowIndexes={new Set(chapterValidationResult.validRows.map(row => row.rowIndex))}
									importFailures={chapterImportResult.failed.map(failure => ({
										rowIndex: failure.rowIndex,
										message: failure.message,
									}))}
									phase="execute"
									suggestionsKey="import.chapters.validation.suggestions"
									filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
								/>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">{$t('import.chapters.resultUnexpected')}</p>
					{/if}
				</section>
			{:else if isBillingImport && step === 'execute'}
				<section class="space-y-4" data-testid="billing-import-step-execute">
					{#if importing}
						<p class="text-sm text-muted-foreground">{$t('import.billing.executing')}</p>
						<ImportProgressBar
							current={importProgress.current}
							total={importProgress.total}
							label={$t('import.billing.executeProgress', {
								current: importProgress.current,
								total: importProgress.total,
							})}
						/>
					{:else if billingImportResult}
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">{$t('import.billing.resultTitle')}</h3>
							{#if importFatalError}
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{importFatalError}
								</p>
							{/if}
							<div class="grid gap-2 sm:grid-cols-2">
								<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
									{$t('import.billing.resultCreated', { n: billingImportResult.created })}
								</p>
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{$t('import.billing.resultFailed', { n: billingImportResult.failed.length })}
								</p>
							</div>

							{#if billingImportResult.created === 0 && billingImportResult.failed.length === 0 && !importFatalError}
								<p class="text-sm text-muted-foreground">{$t('import.billing.resultNothing')}</p>
							{/if}

							{#if billingImportResult.failed.length > 0}
								<div class="rounded-xl border border-border bg-secondary/20 p-4">
									<p class="mb-2 text-sm font-semibold">{$t('import.billing.resultFailures')}</p>
									<ul class="space-y-2 text-sm">
										{#each billingImportResult.failed as failure (failure.rowIndex + failure.label)}
											<li>
												<span class="font-mono text-xs text-muted-foreground">L{failure.rowIndex}</span>
												<span class="mx-2">·</span>
												{failure.label}
												<span class="mx-2 text-muted-foreground">—</span>
												{failure.message}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if billingValidationResult}
								<ImportReportDownload
									definition={selectedDefinition}
									rows={billingParsedRows}
									errors={billingValidationResult.errors}
									warnings={billingValidationResult.warnings}
									validRowIndexes={new Set(billingValidationResult.validRows.map(row => row.rowIndex))}
									importFailures={billingImportResult.failed.map(failure => ({
										rowIndex: failure.rowIndex,
										message: failure.message,
									}))}
									phase="execute"
									suggestionsKey="import.billing.validation.suggestions"
									filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
								/>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">{$t('import.billing.resultUnexpected')}</p>
					{/if}
				</section>
			{:else if isPaymentsImport && step === 'execute'}
				<section class="space-y-4" data-testid="payment-import-step-execute">
					{#if importing}
						<p class="text-sm text-muted-foreground">{$t('import.payments.executing')}</p>
						<ImportProgressBar
							current={importProgress.current}
							total={importProgress.total}
							label={$t('import.payments.executeProgress', {
								current: importProgress.current,
								total: importProgress.total,
							})}
						/>
					{:else if paymentImportResult}
						<div class="space-y-3">
							<h3 class="text-sm font-semibold">{$t('import.payments.resultTitle')}</h3>
							{#if importFatalError}
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{importFatalError}
								</p>
							{/if}
							<div class="grid gap-2 sm:grid-cols-2">
								<p class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100">
									{$t('import.payments.resultCreated', { n: paymentImportResult.created })}
								</p>
								<p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{$t('import.payments.resultFailed', { n: paymentImportResult.failed.length })}
								</p>
							</div>

							{#if paymentImportResult.created === 0 && paymentImportResult.failed.length === 0 && !importFatalError}
								<p class="text-sm text-muted-foreground">{$t('import.payments.resultNothing')}</p>
							{/if}

							{#if paymentImportResult.failed.length > 0}
								<div class="rounded-xl border border-border bg-secondary/20 p-4">
									<p class="mb-2 text-sm font-semibold">{$t('import.payments.resultFailures')}</p>
									<ul class="space-y-2 text-sm">
										{#each paymentImportResult.failed as failure (failure.rowIndex + failure.label)}
											<li>
												<span class="font-mono text-xs text-muted-foreground">L{failure.rowIndex}</span>
												<span class="mx-2">·</span>
												{failure.label}
												<span class="mx-2 text-muted-foreground">—</span>
												{failure.message}
											</li>
										{/each}
									</ul>
								</div>
							{/if}

							{#if paymentValidationResult}
								<ImportReportDownload
									definition={selectedDefinition}
									rows={paymentParsedRows}
									errors={paymentValidationResult.errors}
									warnings={paymentValidationResult.warnings}
									validRowIndexes={new Set(paymentValidationResult.validRows.map(row => row.rowIndex))}
									importFailures={paymentImportResult.failed.map(failure => ({
										rowIndex: failure.rowIndex,
										message: failure.message,
									}))}
									phase="execute"
									suggestionsKey="import.payments.validation.suggestions"
									filenameBase={importReportFilenameBase(selectedDefinition.csvFilename)}
								/>
							{/if}
						</div>
					{:else}
						<p class="text-sm text-muted-foreground">{$t('import.payments.resultUnexpected')}</p>
					{/if}
				</section>
			{:else}
				<section class="space-y-4" data-testid="data-import-coming-soon">
					<p class="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
						{$t('import.comingSoon')}
					</p>
				</section>
			{/if}
		</div>

		<Dialog.Footer class="shrink-0 gap-2 border-t border-border px-6 py-4 sm:justify-between">
			<div class="flex gap-2">
				{#if isWiredImport && (step === 'upload' || step === 'validate')}
					<Button
						variant="outline"
						disabled={importing}
						onclick={() => (step = step === 'validate' ? 'upload' : 'download')}
						data-testid="data-import-back"
					>
						{$t('common.back')}
					</Button>
				{/if}
			</div>
			<div class="flex flex-wrap gap-2">
				{#if isStudentsImport && step === 'execute' && studentImportResult}
					<Button
						onclick={() => {
							notifyStudentsListChanged();
							handleOpenChange(false);
							void appGoto(studentsHref, { invalidateAll: true });
						}}
						data-testid="student-import-view-students"
					>
						{$t('import.students.viewStudents')}
					</Button>
				{/if}
				{#if isClassesImport && step === 'execute' && classImportResult}
					<Button
						onclick={() => {
							handleOpenChange(false);
							void appGoto(classesHref, { invalidateAll: true });
						}}
						data-testid="class-import-view-classes"
					>
						{$t('import.classes.viewClasses')}
					</Button>
				{/if}
				{#if isGuardiansImport && step === 'execute' && guardianImportResult}
					<Button
						onclick={() => {
							notifyGuardiansListChanged();
							handleOpenChange(false);
							void appGoto(guardiansHref, { invalidateAll: true });
						}}
						data-testid="guardian-import-view-guardians"
					>
						{$t('import.guardians.viewGuardians')}
					</Button>
				{/if}
				{#if isStaffImport && step === 'execute' && staffImportResult}
					<Button
						onclick={() => {
							notifyStaffListChanged();
							handleOpenChange(false);
							void appGoto(staffHref, { invalidateAll: true });
						}}
						data-testid="staff-import-view-staff"
					>
						{$t('import.staff.viewStaff')}
					</Button>
				{/if}
				{#if isTeachersImport && step === 'execute' && teacherImportResult}
					<Button
						onclick={() => {
							notifyTeachersListChanged();
							handleOpenChange(false);
							void appGoto(teachersHref, { invalidateAll: true });
						}}
						data-testid="teacher-import-view-teachers"
					>
						{$t('import.teachers.viewTeachers')}
					</Button>
				{/if}
				{#if isTeacherAssignmentsImport && step === 'execute' && teacherAssignmentImportResult}
					<Button
						onclick={() => {
							notifyTeachersListChanged();
							handleOpenChange(false);
							void appGoto(teachersHref, { invalidateAll: true });
						}}
						data-testid="teacher-assignment-import-view-teachers"
					>
						{$t('import.teacherAssignments.viewTeachers')}
					</Button>
				{/if}
				{#if isSubjectsImport && step === 'execute' && subjectImportResult}
					<Button
						onclick={() => {
							notifySubjectsListChanged();
							handleOpenChange(false);
							void appGoto(subjectsHref, { invalidateAll: true });
						}}
						data-testid="subject-import-view-subjects"
					>
						{$t('import.subjects.viewSubjects')}
					</Button>
				{/if}
				{#if isChaptersImport && step === 'execute' && chapterImportResult}
					<Button
						onclick={() => {
							notifySubjectsListChanged();
							handleOpenChange(false);
							void appGoto(subjectsHref, { invalidateAll: true });
						}}
						data-testid="chapter-import-view-subjects"
					>
						{$t('import.chapters.viewSubjects')}
					</Button>
				{/if}
				{#if isBillingImport && step === 'execute' && billingImportResult}
					<Button
						onclick={() => {
							handleOpenChange(false);
							void appGoto(billingHref, { invalidateAll: true });
						}}
						data-testid="billing-import-view-billing"
					>
						{$t('import.billing.viewBilling')}
					</Button>
				{/if}
				{#if isPaymentsImport && step === 'execute' && paymentImportResult}
					<Button
						onclick={() => {
							handleOpenChange(false);
							void appGoto(billingHref, { invalidateAll: true });
						}}
						data-testid="payment-import-view-billing"
					>
						{$t('import.payments.viewBilling')}
					</Button>
				{/if}
				<Button variant="outline" disabled={importing} onclick={() => handleOpenChange(false)}>
					{$t('common.close')}
				</Button>
				{#if step === 'download'}
					<Button
						disabled={!canGoToUpload}
						title={!isActiveImport ? $t('import.comingSoon') : undefined}
						onclick={() => (step = 'upload')}
						data-testid="data-import-next"
					>
						{$t('common.next')}
					</Button>
				{:else if isWiredImport && step === 'upload'}
					<Button
						disabled={!canGoToValidate}
						onclick={() => void goToValidateStep()}
						data-testid="data-import-next"
					>
						{#if preparingValidation}
							<LoaderCircle class="mr-2 size-4 animate-spin" aria-hidden="true" />
						{/if}
						{$t('common.next')}
					</Button>
				{:else if isWiredImport && step === 'validate' && activeValidationResult}
					<Button
						disabled={!canStartImport || importing}
						onclick={() => void startImport()}
						data-testid="data-import-start"
					>
						{#if importing}
							<LoaderCircle class="mr-2 size-4 animate-spin" aria-hidden="true" />
						{/if}
						{importReadyLabel}
					</Button>
				{/if}
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

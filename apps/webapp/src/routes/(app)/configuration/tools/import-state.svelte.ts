import { getBrowserSchoolClient } from '$lib/api/school-client';
import { entityVersions } from '$lib/entity-versions.svelte';
import { loadBillingImportContext } from '$lib/import/billing/load-billing-import-context';
import { runBillingImport } from '$lib/import/billing/runner';
import { runChapterImport } from '$lib/import/chapters/runner';
import { runClassImport } from '$lib/import/classes/runner';
import { runGuardianImport } from '$lib/import/guardians/runner';
import { loadPaymentImportContext } from '$lib/import/payments/load-payment-import-context';
import { runPaymentImport } from '$lib/import/payments/runner';
import { loadChapterImportContext } from '$lib/import/shared/load-chapter-import-context';
import { loadGuardianCodeIndex, loadPaymentReferenceIndex, loadStaffCodeIndex, loadTeacherCodeIndex } from '$lib/import/shared/load-person-code-index';
import { loadSchoolSubjectCatalog } from '$lib/import/shared/load-school-subject-names';
import { loadStudentMatriculeIndex } from '$lib/import/shared/load-student-matricule-index';
import { loadExistingSubjectImportKeys } from '$lib/import/shared/load-subject-import-context';
import { loadTeacherAssignmentImportClassSubjects, loadTeacherAssignmentImportTeachers } from '$lib/import/shared/load-teacher-assignment-import-context';
import { runStaffImport } from '$lib/import/staff/runner';
import { runStudentImport } from '$lib/import/students/runner';
import { runSubjectImport } from '$lib/import/subjects/runner';
import { runTeacherAssignmentImport } from '$lib/import/teacher-assignments/runner';
import { runTeacherImport } from '$lib/import/teachers/runner';

/** Route-owned import I/O; parsed rows and field drafts stay with the wizard. */
export class DataImportState {
	loadBillingImportContext = (...args: Parameters<typeof loadBillingImportContext> extends [unknown, ...infer Rest] ? Rest : never) => loadBillingImportContext(getBrowserSchoolClient(), ...args);
	async runBillingImport(options: Omit<Parameters<typeof runBillingImport>[0], 'client'>) {
		const result = await runBillingImport({ ...options, client: getBrowserSchoolClient() });
		if (result.created > 0) {
			for (const key of ['billing'] as const) entityVersions.bump(key);
}
		return result;
	}

	async runChapterImport(options: Omit<Parameters<typeof runChapterImport>[0], 'client'>) {
		const result = await runChapterImport({ ...options, client: getBrowserSchoolClient() });
		if (result.created > 0) {
			for (const key of ['subjects'] as const) entityVersions.bump(key);
}
		return result;
	}

	async runClassImport(options: Omit<Parameters<typeof runClassImport>[0], 'client'>) {
		const result = await runClassImport({ ...options, client: getBrowserSchoolClient() });
		if (result.created > 0) {
			for (const key of ['subjects', 'planning', 'staff'] as const) entityVersions.bump(key);
}
		return result;
	}

	async runGuardianImport(options: Omit<Parameters<typeof runGuardianImport>[0], 'client'>) {
		const result = await runGuardianImport({ ...options, client: getBrowserSchoolClient() });
		if (result.created > 0 || result.linksCreated > 0) {
			for (const key of ['guardians', 'students'] as const) entityVersions.bump(key);
}
		return result;
	}

	loadPaymentImportContext = (...args: Parameters<typeof loadPaymentImportContext> extends [unknown, ...infer Rest] ? Rest : never) => loadPaymentImportContext(getBrowserSchoolClient(), ...args);
	async runPaymentImport(options: Omit<Parameters<typeof runPaymentImport>[0], 'client'>) {
		const result = await runPaymentImport({ ...options, client: getBrowserSchoolClient() });
		if (result.created > 0) {
			for (const key of ['payments', 'billing'] as const) entityVersions.bump(key);
}
		return result;
	}

	loadChapterImportContext = (...args: Parameters<typeof loadChapterImportContext> extends [unknown, ...infer Rest] ? Rest : never) => loadChapterImportContext(getBrowserSchoolClient(), ...args);
	loadGuardianCodeIndex = (...args: Parameters<typeof loadGuardianCodeIndex>) => loadGuardianCodeIndex(...args);
	loadPaymentReferenceIndex = (...args: Parameters<typeof loadPaymentReferenceIndex>) => loadPaymentReferenceIndex(...args);
	loadStaffCodeIndex = (...args: Parameters<typeof loadStaffCodeIndex>) => loadStaffCodeIndex(...args);
	loadTeacherCodeIndex = (...args: Parameters<typeof loadTeacherCodeIndex>) => loadTeacherCodeIndex(...args);
	loadSchoolSubjectCatalog = (...args: Parameters<typeof loadSchoolSubjectCatalog>) => loadSchoolSubjectCatalog(...args);
	loadStudentMatriculeIndex = (...args: Parameters<typeof loadStudentMatriculeIndex>) => loadStudentMatriculeIndex(...args);
	loadExistingSubjectImportKeys = (...args: Parameters<typeof loadExistingSubjectImportKeys>) => loadExistingSubjectImportKeys(...args);
	loadTeacherAssignmentImportClassSubjects = (...args: Parameters<typeof loadTeacherAssignmentImportClassSubjects> extends [unknown, ...infer Rest] ? Rest : never) => loadTeacherAssignmentImportClassSubjects(getBrowserSchoolClient(), ...args);
	loadTeacherAssignmentImportTeachers = (...args: Parameters<typeof loadTeacherAssignmentImportTeachers> extends [unknown, ...infer Rest] ? Rest : never) => loadTeacherAssignmentImportTeachers(getBrowserSchoolClient(), ...args);
	async runStaffImport(options: Omit<Parameters<typeof runStaffImport>[0], 'client'>) {
		const result = await runStaffImport({ ...options, client: getBrowserSchoolClient() });
		if (result.created > 0) {
			for (const key of ['staff'] as const) entityVersions.bump(key);
}
		return result;
	}

	async runStudentImport(options: Omit<Parameters<typeof runStudentImport>[0], 'client'>) {
		const result = await runStudentImport({ ...options, client: getBrowserSchoolClient() });
		if (result.created > 0) {
			for (const key of ['students', 'guardians', 'enrollments'] as const) entityVersions.bump(key);
}
		return result;
	}

	async runSubjectImport(options: Omit<Parameters<typeof runSubjectImport>[0], 'client'>) {
		const result = await runSubjectImport({ ...options, client: getBrowserSchoolClient() });
		if (result.created > 0) {
			for (const key of ['subjects', 'planning'] as const) entityVersions.bump(key);
}
		return result;
	}

	async runTeacherAssignmentImport(options: Omit<Parameters<typeof runTeacherAssignmentImport>[0], 'client'>) {
		const result = await runTeacherAssignmentImport({ ...options, client: getBrowserSchoolClient() });
		if (result.created > 0) {
			for (const key of ['teachers', 'staff', 'planning', 'subjects'] as const) entityVersions.bump(key);
}
		return result;
	}

	async runTeacherImport(options: Omit<Parameters<typeof runTeacherImport>[0], 'client'>) {
		const result = await runTeacherImport({ ...options, client: getBrowserSchoolClient() });
		if (result.created > 0) {
			for (const key of ['teachers'] as const) entityVersions.bump(key);
}
		return result;
	}
}

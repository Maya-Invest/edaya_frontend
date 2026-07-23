import type {
	TeacherAssignmentImportClassSubjectOption,
	TeacherAssignmentImportColumnKey,
	TeacherAssignmentImportRow,
	TeacherAssignmentImportTeacherOption,
	TeacherAssignmentImportValidationContext,
	TeacherAssignmentImportValidationIssue,
	TeacherAssignmentImportValidationResult,
	ValidatedTeacherAssignmentImportRow,
} from './types';
import { canImportValidatedRows } from '$lib/import/shared/can-import-validated-rows';
import { normalizeImportCode } from '$lib/import/shared/normalize-import-code';
import {
	buildImportClassLookup,
	resolveImportClassGroup,
} from '$lib/import/shared/resolve-import-class-group';
import {
	isKnownSubjectName,
	resolveSubjectCatalogId,
	subjectNameSuggestions,
} from '$lib/import/teachers/subject-name-lookup';

function issue(
	input: Omit<TeacherAssignmentImportValidationIssue, 'severity'> & {
		severity?: TeacherAssignmentImportValidationIssue['severity'];
	},
): TeacherAssignmentImportValidationIssue {
	return {
		...input,
		severity: input.severity ?? 'error',
	};
}

function validateRequiredField(
	row: TeacherAssignmentImportRow,
	column: TeacherAssignmentImportColumnKey,
	value: string,
	issues: TeacherAssignmentImportValidationIssue[],
): boolean {
	if (value.trim().length > 0) {
		return true;
	}
	issues.push(issue({
		rowIndex: row.rowIndex,
		column,
		messageKey: 'import.teacherAssignments.validation.required',
	}));
	return false;
}

function resolveTeacher(
	code: string,
	teachers: readonly TeacherAssignmentImportTeacherOption[],
): TeacherAssignmentImportTeacherOption | undefined {
	const normalized = normalizeImportCode(code);
	return teachers.find(entry => normalizeImportCode(entry.code) === normalized);
}

function resolveClassSubjectId(
	classGroupId: string,
	subjectName: string,
	catalog: TeacherAssignmentImportValidationContext['subjectCatalog'],
	classSubjects: readonly TeacherAssignmentImportClassSubjectOption[],
): string | undefined {
	const subjectId = resolveSubjectCatalogId(subjectName, catalog);
	if (!subjectId) {
		return undefined;
	}
	return classSubjects.find(
		entry => entry.classGroupId === classGroupId && entry.subjectId === subjectId,
	)?.id;
}

export function validateTeacherAssignmentImportRows(
	rows: readonly TeacherAssignmentImportRow[],
	context: TeacherAssignmentImportValidationContext,
): TeacherAssignmentImportValidationResult {
	const errors: TeacherAssignmentImportValidationIssue[] = [];
	const warnings: TeacherAssignmentImportValidationIssue[] = [];
	const validRows: ValidatedTeacherAssignmentImportRow[] = [];
	const assignmentsInFile = new Map<string, number>();
	const { teachers, classes, subjectCatalog, classSubjects } = context;
	const knownSubjectNames = subjectCatalog.map(entry => entry.name);
	const classLookup = buildImportClassLookup(classes);

	for (const row of rows) {
		const rowIssues: TeacherAssignmentImportValidationIssue[] = [];

		const hasCode = validateRequiredField(row, 'code', row.code, rowIssues);
		const hasClasse = validateRequiredField(row, 'classe', row.classe, rowIssues);
		const hasMatiere = validateRequiredField(row, 'matiere', row.matiere, rowIssues);

		let teacher: TeacherAssignmentImportTeacherOption | undefined;
		if (hasCode) {
			teacher = resolveTeacher(row.code, teachers);
			if (!teacher) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'code',
					value: row.code,
					messageKey: 'import.teacherAssignments.validation.teacherNotFound',
					suggestions: teachers.slice(0, 5).map(entry => entry.code).filter(Boolean),
				}));
			}
		}

		let classGroupId: string | undefined;
		if (hasClasse) {
			const resolution = resolveImportClassGroup(row.classe, classLookup, classes);
			if (resolution.classGroupId) {
				classGroupId = resolution.classGroupId;
			}
			else {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'classe',
					value: row.classe,
					messageKey: 'import.teacherAssignments.validation.classNotFound',
					suggestions: resolution.suggestions,
				}));
			}
		}

		let classSubjectId: string | undefined;
		if (hasMatiere) {
			if (knownSubjectNames.length > 0 && !isKnownSubjectName(row.matiere, knownSubjectNames)) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'matiere',
					value: row.matiere,
					messageKey: 'import.teacherAssignments.validation.unknownSubject',
					suggestions: subjectNameSuggestions(row.matiere, knownSubjectNames),
				}));
			}
			else if (classGroupId) {
				classSubjectId = resolveClassSubjectId(
					classGroupId,
					row.matiere,
					subjectCatalog,
					classSubjects,
				);
				if (!classSubjectId) {
					rowIssues.push(issue({
						rowIndex: row.rowIndex,
						column: 'matiere',
						value: row.matiere,
						messageKey: 'import.teacherAssignments.validation.subjectNotInClass',
						messageParams: { subject: row.matiere, class: row.classe },
					}));
				}
			}
		}

		if (teacher && classSubjectId) {
			const duplicateKey = `${teacher.id}::${classSubjectId}`;
			const previousRow = assignmentsInFile.get(duplicateKey);
			if (previousRow != null) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'matiere',
					value: row.matiere,
					messageKey: 'import.teacherAssignments.validation.duplicateInFile',
					messageParams: { row: previousRow },
				}));
			}
			else {
				assignmentsInFile.set(duplicateKey, row.rowIndex);
			}
		}

		const hasBlockingIssues = rowIssues.some(entry => entry.severity === 'error');
		for (const rowIssue of rowIssues) {
			if (rowIssue.severity === 'warning') {
				warnings.push(rowIssue);
			}
			else {
				errors.push(rowIssue);
			}
		}

		if (!hasBlockingIssues && teacher && classGroupId && classSubjectId) {
			validRows.push({
				...row,
				teacherId: teacher.id,
				teacherName: teacher.name,
				classGroupId,
				classSubjectId,
			});
		}
	}

	return { validRows, errors, warnings };
}

export function canImportValidatedTeacherAssignments(
	result: TeacherAssignmentImportValidationResult | null,
): boolean {
	return canImportValidatedRows(result);
}

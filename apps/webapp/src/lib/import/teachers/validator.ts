import type {
	TeacherImportColumnKey,
	TeacherImportRow,
	TeacherImportValidationContext,
	TeacherImportValidationIssue,
	TeacherImportValidationResult,
	ValidatedTeacherImportRow,
} from './types';
import { canImportValidatedRows } from '$lib/import/shared/can-import-validated-rows';
import {
	buildImportClassLookup,
	resolveImportClassGroup,
} from '$lib/import/shared/resolve-import-class-group';
import { parseTeacherSubjectNames } from './parse-subject-names';
import { resolveTeacherImportClassSubjectIds } from './resolve-teacher-import-assignments';
import {
	isKnownSubjectName,
	resolvePrimarySubjectId,
	subjectNameSuggestions,
} from './subject-name-lookup';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

function normalizeLookupValue(value: string): string {
	return value.trim().toLowerCase();
}

function issue(
	input: Omit<TeacherImportValidationIssue, 'severity'> & { severity?: TeacherImportValidationIssue['severity'] },
): TeacherImportValidationIssue {
	return {
		...input,
		severity: input.severity ?? 'error',
	};
}

function validateRequiredField(
	row: TeacherImportRow,
	column: TeacherImportColumnKey,
	value: string,
	issues: TeacherImportValidationIssue[],
): boolean {
	if (value.trim().length > 0) {
		return true;
	}
	issues.push(issue({
		rowIndex: row.rowIndex,
		column,
		messageKey: 'import.teachers.validation.required',
	}));
	return false;
}

export function validateTeacherImportRows(
	rows: readonly TeacherImportRow[],
	context: TeacherImportValidationContext = { subjectCatalog: [] },
): TeacherImportValidationResult {
	const errors: TeacherImportValidationIssue[] = [];
	const warnings: TeacherImportValidationIssue[] = [];
	const validRows: ValidatedTeacherImportRow[] = [];
	const teachersInFile = new Map<string, number>();
	const emailsInFile = new Map<string, number>();
	const { subjectCatalog, classes = [], classSubjects = [] } = context;
	const knownSubjectNames = subjectCatalog.map(entry => entry.name);
	const classLookup = buildImportClassLookup(classes);

	for (const row of rows) {
		const rowIssues: TeacherImportValidationIssue[] = [];

		const hasPrenom = validateRequiredField(row, 'prenom', row.prenom, rowIssues);
		const hasNom = validateRequiredField(row, 'nom', row.nom, rowIssues);
		const subjectNames = parseTeacherSubjectNames(row.matieres);

		if (knownSubjectNames.length > 0) {
			for (const subjectName of subjectNames) {
				if (!isKnownSubjectName(subjectName, knownSubjectNames)) {
					rowIssues.push(issue({
						rowIndex: row.rowIndex,
						column: 'matieres',
						value: subjectName,
						messageKey: 'import.teachers.validation.unknownSubject',
						severity: 'warning',
						suggestions: subjectNameSuggestions(subjectName, knownSubjectNames),
					}));
				}
			}
		}

		if (subjectNames.length > 1 && !row.classe?.trim()) {
			rowIssues.push(issue({
				rowIndex: row.rowIndex,
				column: 'matieres',
				value: row.matieres,
				messageKey: 'import.teachers.validation.multiSubjectsNeedClass',
				severity: 'warning',
			}));
		}

		if (row.email?.trim()) {
			if (!EMAIL_PATTERN.test(row.email.trim())) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'email',
					value: row.email,
					messageKey: 'import.teachers.validation.invalidEmail',
					severity: 'warning',
				}));
			}
			else {
				const normalizedEmail = normalizeLookupValue(row.email);
				const previousRow = emailsInFile.get(normalizedEmail);
				if (previousRow != null) {
					rowIssues.push(issue({
						rowIndex: row.rowIndex,
						column: 'email',
						value: row.email,
						messageKey: 'import.teachers.validation.duplicateEmailInFile',
						messageParams: { row: previousRow },
					}));
				}
				else {
					emailsInFile.set(normalizedEmail, row.rowIndex);
				}
			}
		}

		if (hasPrenom && hasNom) {
			const duplicateKey = [
				normalizeLookupValue(row.prenom),
				normalizeLookupValue(row.nom),
				normalizeLookupValue(row.email ?? ''),
			].join('::');
			const previousRow = teachersInFile.get(duplicateKey);
			if (previousRow != null) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'nom',
					value: row.nom,
					messageKey: 'import.teachers.validation.duplicateInFile',
					messageParams: { row: previousRow },
				}));
			}
			else {
				teachersInFile.set(duplicateKey, row.rowIndex);
			}
		}

		const blockingIssues = rowIssues.filter(entry => entry.severity === 'error');
		let classGroupId: string | undefined;
		let assignmentClassSubjectIds: string[] | undefined;

		if (blockingIssues.length === 0 && hasPrenom && hasNom && row.classe?.trim()) {
			const resolution = resolveImportClassGroup(row.classe, classLookup, classes);
			if (resolution.classGroupId) {
				classGroupId = resolution.classGroupId;
				const className = classes.find(entry => entry.id === classGroupId)?.name ?? row.classe;

				if (subjectNames.length === 0) {
					rowIssues.push(issue({
						rowIndex: row.rowIndex,
						column: 'classe',
						value: row.classe,
						messageKey: 'import.teachers.validation.classWithoutSubjects',
						severity: 'warning',
					}));
				}
				else if (classSubjects.length > 0) {
					const assignmentResolution = resolveTeacherImportClassSubjectIds(
						classGroupId,
						subjectNames,
						subjectCatalog,
						classSubjects,
					);
					for (const subjectName of assignmentResolution.missingInClass) {
						rowIssues.push(issue({
							rowIndex: row.rowIndex,
							column: 'matieres',
							value: subjectName,
							messageKey: 'import.teachers.validation.subjectNotInClass',
							messageParams: { subject: subjectName, class: className },
							severity: 'warning',
						}));
					}
					if (assignmentResolution.classSubjectIds.length > 0) {
						assignmentClassSubjectIds = assignmentResolution.classSubjectIds;
					}
				}
			}
			else {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'classe',
					value: row.classe,
					messageKey: 'import.teachers.validation.classNotFound',
					suggestions: resolution.suggestions,
				}));
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

		if (!hasBlockingIssues && hasPrenom && hasNom) {
			const primarySubjectId = resolvePrimarySubjectId(subjectNames, subjectCatalog);
			validRows.push({
				...row,
				subjectNames,
				...(primarySubjectId ? { primarySubjectId } : {}),
				...(classGroupId ? { classGroupId } : {}),
				...(assignmentClassSubjectIds ? { assignmentClassSubjectIds } : {}),
			});
		}
	}

	return { validRows, errors, warnings };
}

export function canImportValidatedTeachers(result: TeacherImportValidationResult | null): boolean {
	return canImportValidatedRows(result);
}

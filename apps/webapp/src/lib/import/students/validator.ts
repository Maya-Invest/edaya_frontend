import type {
	StudentImportClassOption,
	StudentImportColumnKey,
	StudentImportRow,
	StudentImportValidationContext,
	StudentImportValidationIssue,
	StudentImportValidationResult,
	ValidatedStudentImportRow,
} from './types';
import { canImportValidatedRows } from '$lib/import/shared/can-import-validated-rows';
import { normalizeStudentMatricule } from '$lib/import/shared/normalize-student-matricule';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeLookupValue(value: string): string {
	return value.trim().toLowerCase();
}

export function isValidStudentImportBirthDate(value: string): boolean {
	if (!ISO_DATE_RE.test(value)) {
		return false;
	}
	const [year, month, day] = value.split('-').map(Number);
	const parsed = new Date(Date.UTC(year, month - 1, day));
	return parsed.getUTCFullYear() === year
		&& parsed.getUTCMonth() === month - 1
		&& parsed.getUTCDate() === day;
}

function buildClassLookup(classes: readonly StudentImportClassOption[]): Map<string, StudentImportClassOption[]> {
	const lookup = new Map<string, StudentImportClassOption[]>();
	for (const classGroup of classes) {
		const key = normalizeLookupValue(classGroup.name);
		const bucket = lookup.get(key) ?? [];
		bucket.push(classGroup);
		lookup.set(key, bucket);
	}
	return lookup;
}

function resolveClassGroup(
	className: string,
	lookup: Map<string, StudentImportClassOption[]>,
	allClasses: readonly StudentImportClassOption[],
): { classGroupId?: string; suggestions?: string[] } {
	const key = normalizeLookupValue(className);
	if (!key) {
		return { suggestions: allClasses.slice(0, 5).map(entry => entry.name) };
	}

	const matches = lookup.get(key) ?? [];
	if (matches.length === 1) {
		return { classGroupId: matches[0]?.id };
	}

	const suggestions = allClasses
		.map(entry => entry.name)
		.filter((name) => {
			const normalized = normalizeLookupValue(name);
			return normalized.includes(key) || key.includes(normalized);
		})
		.slice(0, 5);

	return {
		suggestions: suggestions.length > 0 ? suggestions : allClasses.slice(0, 5).map(entry => entry.name),
	};
}

function issue(
	input: Omit<StudentImportValidationIssue, 'severity'> & { severity?: StudentImportValidationIssue['severity'] },
): StudentImportValidationIssue {
	return {
		...input,
		severity: input.severity ?? 'error',
	};
}

function validateRequiredField(
	row: StudentImportRow,
	column: StudentImportColumnKey,
	value: string,
	issues: StudentImportValidationIssue[],
): boolean {
	if (value.trim().length > 0) {
		return true;
	}
	issues.push(issue({
		rowIndex: row.rowIndex,
		column,
		messageKey: 'import.students.validation.required',
	}));
	return false;
}

function appendCapacityWarnings(
	validRows: readonly ValidatedStudentImportRow[],
	classes: readonly StudentImportClassOption[],
	warnings: StudentImportValidationIssue[],
) {
	const classById = new Map(classes.map(entry => [entry.id, entry]));
	const pendingByClass = new Map<string, number>();

	for (const row of validRows) {
		if (!row.classGroupId) {
			continue;
		}
		pendingByClass.set(row.classGroupId, (pendingByClass.get(row.classGroupId) ?? 0) + 1);
	}

	for (const [classGroupId, pendingCount] of pendingByClass) {
		const classInfo = classById.get(classGroupId);
		if (!classInfo?.capacity || classInfo.capacity <= 0) {
			continue;
		}

		const overflow = classInfo.studentCount + pendingCount - classInfo.capacity;
		if (overflow <= 0) {
			continue;
		}

		const overflowRows = validRows
			.filter(row => row.classGroupId === classGroupId)
			.slice(-overflow);

		for (const row of overflowRows) {
			delete row.classGroupId;
			warnings.push(issue({
				rowIndex: row.rowIndex,
				column: 'classe',
				value: classInfo.name,
				messageKey: 'import.students.validation.capacityExceeded',
				messageParams: {
					class: classInfo.name,
					capacity: classInfo.capacity,
				},
				severity: 'warning',
			}));
		}
	}
}

export function validateStudentImportRows(
	rows: readonly StudentImportRow[],
	context: StudentImportValidationContext,
): StudentImportValidationResult {
	const errors: StudentImportValidationIssue[] = [];
	const warnings: StudentImportValidationIssue[] = [];
	const validRows: ValidatedStudentImportRow[] = [];
	const classLookup = buildClassLookup(context.classes);
	const matriculesInFile = new Map<string, number>();

	for (const row of rows) {
		const rowIssues: StudentImportValidationIssue[] = [];

		const hasPrenom = validateRequiredField(row, 'prenom', row.prenom, rowIssues);
		const hasNom = validateRequiredField(row, 'nom', row.nom, rowIssues);
		const hasMatricule = validateRequiredField(row, 'matricule', row.matricule, rowIssues);

		if (row.date_naissance && !isValidStudentImportBirthDate(row.date_naissance)) {
			rowIssues.push(issue({
				rowIndex: row.rowIndex,
				column: 'date_naissance',
				value: row.date_naissance,
				messageKey: 'import.students.validation.invalidDate',
			}));
		}

		let classGroupId: string | undefined;
		if (row.classe?.trim()) {
			const resolution = resolveClassGroup(row.classe, classLookup, context.classes);
			if (resolution.classGroupId) {
				classGroupId = resolution.classGroupId;
			}
			else {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'classe',
					value: row.classe,
					messageKey: 'import.students.validation.classNotFound',
					suggestions: resolution.suggestions,
				}));
			}
		}

		if (hasMatricule) {
			const normalizedMatricule = normalizeStudentMatricule(row.matricule);
			const previousRow = matriculesInFile.get(normalizedMatricule);
			if (previousRow != null) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'matricule',
					value: row.matricule,
					messageKey: 'import.students.validation.duplicateMatriculeInFile',
					messageParams: { row: previousRow },
				}));
			}
			else {
				matriculesInFile.set(normalizedMatricule, row.rowIndex);
			}

			if (context.existingMatricules?.has(normalizedMatricule)) {
				rowIssues.push(issue({
					rowIndex: row.rowIndex,
					column: 'matricule',
					value: row.matricule,
					messageKey: 'import.students.validation.duplicateMatriculeExisting',
				}));
			}
		}

		const blockingIssues = rowIssues.filter(entry => entry.severity === 'error');
		for (const rowIssue of rowIssues) {
			if (rowIssue.severity === 'warning') {
				warnings.push(rowIssue);
			}
			else {
				errors.push(rowIssue);
			}
		}

		if (blockingIssues.length === 0 && hasPrenom && hasNom && hasMatricule) {
			const validatedRow: ValidatedStudentImportRow = {
				...row,
				...(classGroupId ? { classGroupId } : {}),
			};
			validRows.push(validatedRow);

			if (!row.classe?.trim()) {
				warnings.push(issue({
					rowIndex: row.rowIndex,
					column: 'classe',
					messageKey: 'import.students.validation.noClassAssigned',
					severity: 'warning',
				}));
			}
		}
	}

	appendCapacityWarnings(validRows, context.classes, warnings);

	return { validRows, errors, warnings };
}

export function countBlockingValidationErrors(result: StudentImportValidationResult): number {
	return result.errors.length;
}

export function canImportValidatedStudents(result: StudentImportValidationResult | null): boolean {
	return canImportValidatedRows(result);
}

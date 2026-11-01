import type { ImportTypeDefinition, ImportTypeKey } from './types';
import { BookOpen, Users, User, GraduationCap, HeartHandshake, Layers, Receipt, Wallet, ClipboardCheck, FileText } from '$lib/icons';

/** Presentation metadata only. Templates and import rules come from the generated backend API. */
export const IMPORT_TYPE_DEFINITIONS: readonly ImportTypeDefinition[] = [
	{ key: 'students', icon: Users, permission: 'STUDENT_CREATE' },
	{ key: 'guardians', icon: HeartHandshake, permission: 'PARENT_MANAGE' },
	{ key: 'teachers', icon: GraduationCap, permission: 'ACCESS_CONTROL_MANAGE' },
	{ key: 'staff', icon: User, permission: 'STAFF_MANAGE' },
	{ key: 'classes', icon: Layers, permission: 'SCHOOL_CONFIGURE' },
	{ key: 'subjects', icon: BookOpen, permission: 'ACADEMIC_PROGRAM_MANAGE' },
	{ key: 'teacher_assignments', icon: ClipboardCheck, permission: 'ACCESS_CONTROL_MANAGE' },
	{ key: 'chapters', icon: FileText, permission: 'ACADEMIC_PROGRAM_MANAGE' },
	{ key: 'billing', icon: Receipt, permission: 'PAYMENT_RECORD' },
	{ key: 'payments', icon: Wallet, permission: 'PAYMENT_RECORD' },
	{ key: 'academic_disciplines', icon: BookOpen, permission: 'ACADEMIC_CATALOG_MANAGE' },
	{ key: 'placement_statuses', icon: Layers, permission: 'ACADEMIC_CATALOG_MANAGE' },
	{ key: 'guardian_relationships', icon: Users, permission: 'PARENT_MANAGE' },
	{ key: 'class_offerings', icon: BookOpen, permission: 'ACADEMIC_PROGRAM_MANAGE' },
].map(item => ({ ...item, key: item.key as ImportTypeKey, permission: item.permission as ImportTypeDefinition['permission'], labelKey: ['academic_disciplines', 'placement_statuses', 'guardian_relationships', 'class_offerings'].includes(item.key) ? `durableImport.types.${item.key}` : `import.types.${item.key}.label`, descriptionKey: 'durableImport.description', hintKey: 'durableImport.description', status: 'active', csvFilename: `${item.key}-v1.csv`, xlsxFilename: `${item.key}-v1.xlsx`, xlsxSheetName: item.key, columns: [], exampleRow: {} }));
export const IMPORT_TYPE_BY_KEY = Object.fromEntries(IMPORT_TYPE_DEFINITIONS.map(item => [item.key, item])) as Record<ImportTypeKey, ImportTypeDefinition>;
export function getImportTypeDefinition(key: ImportTypeKey) {
	return IMPORT_TYPE_BY_KEY[key];
}

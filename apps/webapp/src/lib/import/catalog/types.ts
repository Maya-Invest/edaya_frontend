import type { PermissionCode } from '$lib/auth/types';
import type { LucideIcon } from '$lib/icons';

export type ImportTypeKey = 'students' | 'guardians' | 'staff' | 'teachers' | 'classes' | 'subjects' | 'chapters' | 'payments';

export type ImportTypeStatus = 'active' | 'template_only';

export interface ImportTypeColumnDefinition {
	key: string;
	required: boolean;
	labelKey: string;
}

export interface ImportTypeDefinition {
	key: ImportTypeKey;
	labelKey: string;
	descriptionKey: string;
	hintKey: string;
	status: ImportTypeStatus;
	icon: LucideIcon;
	csvFilename: string;
	xlsxFilename: string;
	xlsxSheetName: string;
	columns: readonly ImportTypeColumnDefinition[];
	exampleRow: Record<string, string>;
	permission?: PermissionCode;
	downloadCsvTemplate?: () => void;
	downloadExcelTemplate?: () => void;
}

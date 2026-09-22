import type { PermissionCode } from '$lib/auth/types';

export type OtherConfigHref
	= '/configuration/other/grade-scales'
	| '/configuration/other/discipline'
	| '/configuration/other/subject-categories';

export interface OtherConfigEntry {
	key: string;
	labelKey: string;
	href: OtherConfigHref;
	permissions: readonly PermissionCode[];
}

export const OTHER_CONFIG_ENTRIES: readonly OtherConfigEntry[] = [
	{
		key: 'gradeScales',
		labelKey: 'config.gradeScales',
		href: '/configuration/other/grade-scales',
		permissions: ['REPORT_CARD_CONFIGURE', 'EXAM_CONFIG_READ', 'EXAM_CONFIG_CONFIGURE'],
	},
	{
		key: 'discipline',
		labelKey: 'config.discipline',
		href: '/configuration/other/discipline',
		permissions: ['DISCIPLINE_VALIDATE'],
	},
	{
		key: 'subjectCategories',
		labelKey: 'config.subjectCategories',
		href: '/configuration/other/subject-categories',
		permissions: ['ACADEMIC_PROGRAM_READ', 'ACADEMIC_PROGRAM_UPDATE'],
	},
];

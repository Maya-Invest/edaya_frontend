import type { ResolvedPathname } from '$app/types';
import type { SchoolOverviewResponse } from '$lib/api/dashboard-data';
import { resolveActiveClassId } from '$lib/academic/class-selection';
import type { ClassNode } from '$lib/types/school';
import { appPath, classItemHref } from '$lib/navigation/app-navigation';

export type DashboardActionKey = SchoolOverviewResponse['actionItems'][number]['key'];

export function dashboardActionHref(
	key: DashboardActionKey,
	classes: ClassNode[],
): ResolvedPathname {
	switch (key) {
		case 'overdue_fees':
			return appPath('/(app)/finance/billing/[[id]]');
		case 'unpublished_report_cards':
			return appPath('/(app)/configuration/report-cards/[[id]]');
		case 'pending_justifications':
			return appPath('/(app)/school/students/[[id]]');
		case 'high_severity_incidents':
			return appPath('/(app)/school/events/[[id]]');
		case 'incomplete_grading':
			return classItemHref(resolveActiveClassId(undefined, classes), 'evaluations');
	}
}

export function dashboardClassStudentsHref(
	classGroupId: string,
	classes: ClassNode[],
): ResolvedPathname {
	return classItemHref(resolveActiveClassId(classGroupId, classes), 'students');
}

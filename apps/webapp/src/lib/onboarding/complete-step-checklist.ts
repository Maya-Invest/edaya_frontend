import { appPath } from '$lib/navigation/app-navigation';

export interface OnboardingCompleteChecklistItem {
	labelKey:
		| 'onboarding.complete.checklist.subjects'
		| 'onboarding.complete.checklist.students'
		| 'onboarding.complete.checklist.scheduling'
		| 'onboarding.complete.checklist.finance';
	href: ReturnType<typeof appPath>;
}

export const ONBOARDING_COMPLETE_CHECKLIST: readonly OnboardingCompleteChecklistItem[] = [
	{
		labelKey: 'onboarding.complete.checklist.subjects',
		href: appPath('/(app)/configuration/subjects/[[id]]'),
	},
	{
		labelKey: 'onboarding.complete.checklist.students',
		href: appPath('/(app)/school/students/[[id]]'),
	},
	{
		labelKey: 'onboarding.complete.checklist.scheduling',
		href: appPath('/(app)/configuration/classes'),
	},
	{
		labelKey: 'onboarding.complete.checklist.finance',
		href: appPath('/(app)/finance'),
	},
];

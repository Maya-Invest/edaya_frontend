export const FAMILY_FEEDBACK_DETAIL_TABS = [
	{ key: 'setup', segment: 'setup', labelKey: 'familyFeedback.tab.setup' },
	{ key: 'audience', segment: 'audience', labelKey: 'familyFeedback.tab.audience' },
	{ key: 'moderation', segment: 'moderation', labelKey: 'familyFeedback.tab.moderation' },
	{ key: 'results', segment: 'results', labelKey: 'familyFeedback.tab.results' },
] as const;

export type FamilyFeedbackDetailTabKey = (typeof FAMILY_FEEDBACK_DETAIL_TABS)[number]['key'];
export type FamilyFeedbackDetailTabSegment = (typeof FAMILY_FEEDBACK_DETAIL_TABS)[number]['segment'];

const TAB_SEGMENTS = new Set<string>(FAMILY_FEEDBACK_DETAIL_TABS.map(tab => tab.segment));

export function isFamilyFeedbackDetailTabSegment(value: string | undefined): value is FamilyFeedbackDetailTabSegment {
	return Boolean(value && TAB_SEGMENTS.has(value));
}

export function activeFamilyFeedbackDetailTab(pathname: string, campaignId: string): FamilyFeedbackDetailTabKey {
	const base = `/school/family-feedback/${campaignId}`;
	if (pathname === base || pathname === `${base}/` || pathname === `${base}/setup`) {
		return 'setup';
	}
	const suffix = pathname.slice(base.length + 1);
	const match = FAMILY_FEEDBACK_DETAIL_TABS.find(tab => tab.segment === suffix.split('/')[0]);
	return match?.key ?? 'setup';
}

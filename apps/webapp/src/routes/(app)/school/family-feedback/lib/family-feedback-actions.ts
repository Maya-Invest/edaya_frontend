import type { FamilyFeedbackCampaign, FamilyFeedbackCampaignStatus } from '$lib/api/family-feedback-types';

export type FamilyFeedbackAction = 'edit' | 'assign-moderator' | 'schedule' | 'open' | 'close' | 'cancel' | 'theme' | 'publish' | 'archive';

const statuses: Record<FamilyFeedbackAction, readonly FamilyFeedbackCampaignStatus[]> = {
	'edit': ['draft', 'scheduled'],
	'assign-moderator': ['draft', 'scheduled', 'open', 'closed', 'cancelled'],
	'schedule': ['draft'],
	'open': ['draft', 'scheduled'],
	'close': ['open'],
	'cancel': ['draft', 'scheduled', 'open'],
	'theme': ['closed'],
	'publish': ['closed'],
	'archive': ['published', 'cancelled'],
};

export function familyFeedbackActionAvailable(campaign: FamilyFeedbackCampaign, action: FamilyFeedbackAction): boolean {
	return statuses[action].includes(campaign.status);
}

/** Presentation guidance only; the server still validates permissions and eligibility. */
export function familyFeedbackActionBlocker(campaign: FamilyFeedbackCampaign, action: FamilyFeedbackAction, now = Date.now()): string | undefined {
	if (!familyFeedbackActionAvailable(campaign, action))
		return 'familyFeedback.error.lifecycle';
	if ((action === 'theme' || action === 'publish') && campaign.answersPurgedAt)
		return 'familyFeedback.error.purged';
	if (action !== 'open' && action !== 'schedule')
		return undefined;
	if (!campaign.moderatorStaffId)
		return 'familyFeedback.error.moderatorRequired';
	if (action === 'schedule' && (!campaign.opensAt || !campaign.closesAt))
		return 'familyFeedback.error.scheduleRequired';
	const opensAt = campaign.opensAt ? Date.parse(campaign.opensAt) : undefined;
	const closesAt = campaign.closesAt ? Date.parse(campaign.closesAt) : undefined;
	if ((opensAt !== undefined && !Number.isFinite(opensAt)) || (closesAt !== undefined && !Number.isFinite(closesAt)))
		return 'familyFeedback.error.scheduleInvalid';
	if (closesAt !== undefined && closesAt <= now)
		return 'familyFeedback.error.closed';
	if (opensAt !== undefined && closesAt !== undefined && closesAt <= opensAt)
		return 'familyFeedback.error.scheduleInvalid';
	return undefined;
}

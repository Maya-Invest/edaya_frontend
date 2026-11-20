import { ApiError } from '@maya-invest/edaya-api-client';

const errorKeys: Record<string, string> = {
	FAMILY_FEEDBACK_MODERATOR_REQUIRED: 'familyFeedback.error.moderatorRequired',
	FAMILY_FEEDBACK_MODERATOR_CONFLICT: 'familyFeedback.error.moderatorConflict',
	FAMILY_FEEDBACK_LIFECYCLE_INVALID: 'familyFeedback.error.lifecycle',
	FAMILY_FEEDBACK_CLOSED: 'familyFeedback.error.closed',
	FAMILY_FEEDBACK_ASSIGNMENT_INVALID: 'familyFeedback.error.assignment',
	FAMILY_FEEDBACK_THRESHOLD_UNMET: 'familyFeedback.error.threshold',
	FAMILY_FEEDBACK_NOT_FOUND: 'familyFeedback.error.notFound',
	FAMILY_FEEDBACK_PURGED: 'familyFeedback.error.purged',
	FAMILY_FEEDBACK_ANSWER_INVALID: 'familyFeedback.error.answer',
	FAMILY_FEEDBACK_ELIGIBILITY_DENIED: 'familyFeedback.error.eligibility',
	FAMILY_FEEDBACK_ALREADY_COMPLETED: 'familyFeedback.error.completed',
};

export function familyFeedbackErrorKey(error: unknown): string | undefined {
	if (!(error instanceof ApiError) || !error.body || typeof error.body !== 'object')
		return undefined;
	const code = (error.body as { code?: unknown }).code;
	return typeof code === 'string' && Object.hasOwn(errorKeys, code) ? errorKeys[code] : undefined;
}

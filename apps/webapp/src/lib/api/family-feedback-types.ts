export const FAMILY_FEEDBACK_STATUSES = [
	'draft',
	'scheduled',
	'open',
	'closed',
	'published',
	'archived',
	'cancelled',
] as const;

export type FamilyFeedbackCampaignStatus = (typeof FAMILY_FEEDBACK_STATUSES)[number];

export const FAMILY_FEEDBACK_QUESTION_IDS = [
	'communication',
	'clarity',
	'support',
	'student_experience',
] as const;

export type FamilyFeedbackQuestionId = (typeof FAMILY_FEEDBACK_QUESTION_IDS)[number];

export interface FamilyFeedbackCampaign {
	id: string;
	status: FamilyFeedbackCampaignStatus;
	academicYearId: string;
	academicPeriodId: string;
	classGroupId: string;
	classSubjectId: string;
	teacherAssignmentId: string;
	teacherId: string;
	subjectId: string;
	questionVersion: string;
	opensAt?: string;
	closesAt?: string;
	openedAt?: string;
	closedAt?: string;
	cancelledAt?: string;
	publishedAt?: string;
	archivedAt?: string;
	answersPurgedAt?: string;
	moderatorStaffId?: string;
	themeDraft?: string;
}

export interface FamilyFeedbackAudiencePreview {
	campaignId: string;
	eligibleCount: number;
	completedCount: number;
	blockers: string[];
}

export interface FamilyFeedbackComment {
	id: string;
	comment: string;
}

export interface FamilyFeedbackQuestionAggregate {
	questionId: FamilyFeedbackQuestionId | string;
	suppressed: boolean;
	nScored: number;
	nCannotAssess: number;
	distribution: {
		1: number;
		2: number;
		3: number;
		4: number;
		5: number;
	};
}

export interface FamilyFeedbackAggregate {
	campaignId: string;
	status?: string;
	eligibleSlotCount: number;
	completedSlotCount: number;
	responseRate: number;
	overallSuppressed: boolean;
	questions: FamilyFeedbackQuestionAggregate[];
	themes?: string;
}

export interface FamilyFeedbackAssignmentOption {
	id: string;
	teacherId: string;
	classSubjectId?: string | null;
	classGroupId?: string | null;
	subjectId?: string | null;
	label: string;
}

export function isFamilyFeedbackStatus(value: string): value is FamilyFeedbackCampaignStatus {
	return (FAMILY_FEEDBACK_STATUSES as readonly string[]).includes(value);
}

export function mapFamilyFeedbackCampaign(row: Record<string, unknown>): FamilyFeedbackCampaign {
	const status = typeof row.status === 'string' && isFamilyFeedbackStatus(row.status)
		? row.status
		: 'draft';
	return {
		id: String(row.id ?? ''),
		status,
		academicYearId: String(row.academicYearId ?? ''),
		academicPeriodId: String(row.academicPeriodId ?? ''),
		classGroupId: String(row.classGroupId ?? ''),
		classSubjectId: String(row.classSubjectId ?? ''),
		teacherAssignmentId: String(row.teacherAssignmentId ?? ''),
		teacherId: String(row.teacherId ?? ''),
		subjectId: String(row.subjectId ?? ''),
		questionVersion: String(row.questionVersion ?? 'family-feedback.v1'),
		opensAt: optionalString(row.opensAt),
		closesAt: optionalString(row.closesAt),
		openedAt: optionalString(row.openedAt),
		closedAt: optionalString(row.closedAt),
		cancelledAt: optionalString(row.cancelledAt),
		publishedAt: optionalString(row.publishedAt),
		archivedAt: optionalString(row.archivedAt),
		answersPurgedAt: optionalString(row.answersPurgedAt),
		moderatorStaffId: optionalString(row.moderatorStaffId),
		themeDraft: optionalString(row.themeDraft),
	};
}

function optionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

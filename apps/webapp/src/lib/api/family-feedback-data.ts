import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type {
	FamilyFeedbackAggregate,
	FeedbackOptionsPage,
	FeedbackPicker,
	FamilyFeedbackAssignmentLabel,
	FamilyFeedbackAudiencePreview,
	FamilyFeedbackCampaign,
	FamilyFeedbackComment,
	FamilyFeedbackQuestionAggregate,
} from './family-feedback-types';
import { academicContext } from '$lib/academic/context.svelte';
import { familyFeedbackCommand, familyFeedbackQuery, familyFeedbackRequestId } from '$lib/api/family-feedback-client';
import { mapFamilyFeedbackCampaign } from '$lib/api/family-feedback-types';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
function asRecordList(value: unknown): Record<string, unknown>[] {
	if (Array.isArray(value)) {
		return value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object');
	}
	if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
		return asRecordList((value as { items: unknown }).items);
	}
	return [];
}

export async function listFamilyFeedbackCampaigns(client: SchoolClient): Promise<FamilyFeedbackCampaign[]> {
	const result = await familyFeedbackQuery<unknown>(
		client,
		'listFamilyFeedbackCampaigns',
		'list-family-feedback-campaigns',
		{},
	);
	return asRecordList(result).map(mapFamilyFeedbackCampaign).filter(campaign => campaign.id.length > 0);
}

export async function previewFamilyFeedbackAudience(
	client: SchoolClient,
	input: {
		id?: string;
		academicYearId: string;
		academicPeriodId: string;
		teacherAssignmentId: string;
	},
): Promise<FamilyFeedbackAudiencePreview> {
	const result = await familyFeedbackQuery<FamilyFeedbackAudiencePreview>(
		client,
		'previewFamilyFeedbackAudience',
		'preview-family-feedback-audience',
		input,
	);
	return {
		campaignId: result.campaignId ?? '',
		eligibleCount: result.eligibleCount ?? 0,
		completedCount: result.completedCount ?? 0,
		blockers: result.blockers ?? [],
	};
}

export async function listFamilyFeedbackComments(
	client: SchoolClient,
	campaignId: string,
): Promise<FamilyFeedbackComment[]> {
	const result = await familyFeedbackQuery<{ comments?: FamilyFeedbackComment[] }>(
		client,
		'listFamilyFeedbackComments',
		'list-family-feedback-comments',
		{ id: campaignId },
	);
	return result.comments ?? [];
}

export async function getFamilyFeedbackAggregateReview(
	client: SchoolClient,
	campaignId: string,
): Promise<FamilyFeedbackAggregate> {
	const result = await familyFeedbackQuery<FamilyFeedbackAggregate>(
		client,
		'getFamilyFeedbackAggregateReview',
		'get-family-feedback-aggregate-review',
		{ id: campaignId },
	);
	return {
		campaignId: result.campaignId,
		status: result.status,
		eligibleSlotCount: result.eligibleSlotCount,
		completedSlotCount: result.completedSlotCount,
		responseRate: result.responseRate,
		overallSuppressed: result.overallSuppressed,
		questions: (result.questions ?? []) as FamilyFeedbackQuestionAggregate[],
		themes: result.themes,
	};
}

export function feedbackClassNames() {
	return new Map(academicContext.classes.map(group => [group.id, group.name]));
}

export function feedbackAssignmentTitle(id: string, label: FamilyFeedbackAssignmentLabel | undefined, classes: ReadonlyMap<string, string>) {
	if (!label)
		return id;
	const className = label.classGroupId ? classes.get(label.classGroupId) : undefined;
	return [label.teacherName, label.subjectName, className].filter(Boolean).join(' · ') || id;
}

export async function loadStaffFeedbackCampaigns(client: SchoolClient, campaignId?: string, signal?: AbortSignal): Promise<FamilyFeedbackCampaign[]> {
	const academicYearId = academicContext.yearId || academicContext.years[0]?.id;
	const { items } = await client.queries.getStaffFeedbackCampaigns({ academicYearId, campaignId }, { signal });
	return items.map(row => ({ ...mapFamilyFeedbackCampaign(row), assignment: row.assignment, moderatorName: row.moderatorName }));
}

export async function loadFeedbackOptions(
	client: SchoolClient,
	input: { academicYearId: string; picker: FeedbackPicker | 'both'; q?: string; after?: string },
	signal: AbortSignal,
): Promise<FeedbackOptionsPage> {
	const page = await client.queries.getStaffFeedbackOptions(input, { signal });
	const classes = feedbackClassNames();
	return {
		...page,
		assignments: page.assignments.map(({ id, teacherName, subjectName, classGroupId }) => {
			const display = { teacherName: teacherName ?? undefined, subjectName: subjectName ?? undefined, classGroupId };
			return { id, label: feedbackAssignmentTitle(id, display, classes), display };
		}),
		moderators: page.moderators.map(({ id, name }) => ({ id, label: name })),
	};
}

export async function createFamilyFeedbackCampaign(
	client: SchoolClient,
	input: {
		academicYearId: string;
		academicPeriodId: string;
		teacherAssignmentId: string;
		opensAt?: string;
		closesAt?: string;
		moderatorStaffId?: string;
	},
): Promise<FamilyFeedbackCampaign> {
	const result = await familyFeedbackCommand<Record<string, unknown>>(
		client,
		'createFamilyFeedbackCampaign',
		'create-family-feedback-campaign',
		{
			requestId: familyFeedbackRequestId(),
			id: crypto.randomUUID(),
			...input,
		},
	);
	return mapFamilyFeedbackCampaign(result);
}

export async function runFamilyFeedbackCampaignCommand(
	client: SchoolClient,
	method: string,
	publicName: string,
	payload: Record<string, unknown>,
): Promise<FamilyFeedbackCampaign> {
	const result = await familyFeedbackCommand<Record<string, unknown>>(client, method, publicName, {
		requestId: familyFeedbackRequestId(),
		...payload,
	});
	return mapFamilyFeedbackCampaign(result);
}

import type { components } from '$lib/api/schema';
import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { StaffMember, Teacher } from '$lib/types/school';
import type {
	FamilyFeedbackAggregate,
	FamilyFeedbackAssignmentOption,
	FamilyFeedbackAudiencePreview,
	FamilyFeedbackCampaign,
	FamilyFeedbackComment,
	FamilyFeedbackQuestionAggregate,
} from './family-feedback-types';
import { academicContext } from '$lib/academic/context.svelte';
import {
	listAllEntityPages,
	schoolSubjectsCatalogList,
} from '$lib/api/entity-list-filters';
import { familyFeedbackCommand, familyFeedbackQuery, familyFeedbackRequestId } from '$lib/api/family-feedback-client';
import { mapFamilyFeedbackCampaign } from '$lib/api/family-feedback-types';
import { safeOptionalEntityList, safeOptionalFetch } from '$lib/api/safe-entity-access';
import { fetchStaffMembers } from '$lib/api/staff-data';
import { fetchAllTeachers } from '$lib/api/teachers-data';
import { authSession } from '$lib/auth/session.svelte';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;
type TeacherAssignmentRaw = components['schemas']['TeacherAssignment'];
type SubjectRaw = components['schemas']['Subject'];
type ClassSubjectRaw = components['schemas']['ClassSubject'];

export interface FamilyFeedbackSlice {
	campaigns: FamilyFeedbackCampaign[];
	teachers: Teacher[];
	staff: StaffMember[];
	assignments: FamilyFeedbackAssignmentOption[];
	subjects: SubjectRaw[];
}

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

export async function getFamilyFeedbackCampaign(
	client: SchoolClient,
	id: string,
): Promise<FamilyFeedbackCampaign | null> {
	const result = await familyFeedbackQuery<Record<string, unknown>>(
		client,
		'getFamilyFeedbackCampaign',
		'get-family-feedback-campaign',
		{ id },
	);
	const campaign = mapFamilyFeedbackCampaign(result ?? {});
	return campaign.id.length > 0 ? campaign : null;
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

function assignmentLabel(
	assignment: TeacherAssignmentRaw,
	teachers: readonly Teacher[],
	classSubjects: readonly ClassSubjectRaw[],
	subjects: readonly SubjectRaw[],
): string {
	const teacher = teachers.find(entry => entry.id === assignment.teacherId);
	const classSubject = classSubjects.find(entry => entry.id === assignment.classSubjectId);
	const subject = subjects.find(entry => entry.id === classSubject?.subjectId);
	const className = academicContext.classes.find(entry => entry.id === (assignment.classGroupId ?? classSubject?.classGroupId))?.name;
	return [teacher?.name, subject?.name, className].filter(Boolean).join(' · ') || assignment.id;
}

export async function loadFamilyFeedbackSlice(client: SchoolClient): Promise<FamilyFeedbackSlice> {
	const schoolId = authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
	const academicYearId = academicContext.yearId || academicContext.years[0]?.id || '';
	if (!schoolId) {
		return { campaigns: [], teachers: [], staff: [], assignments: [], subjects: [] };
	}

	const [campaigns, teachers, staff, assignmentsRaw, subjects, classSubjects] = await Promise.all([
		safeOptionalFetch(() => listFamilyFeedbackCampaigns(client), []),
		academicYearId
			? safeOptionalFetch(() => fetchAllTeachers(client, { schoolId, academicYearId }), [])
			: Promise.resolve([]),
		academicYearId
			? safeOptionalFetch(() => fetchStaffMembers(client, { schoolId, academicYearId }), [])
			: Promise.resolve([]),
		academicYearId
			? safeOptionalEntityList(() => listAllEntityPages(
					query => client.entities.teacherAssignments.list(query),
					{ baseQuery: { academicYearId } },
				))
			: Promise.resolve([]),
		safeOptionalEntityList(() => listAllEntityPages(
			query => client.entities.subjects.list(query),
			{ baseQuery: schoolSubjectsCatalogList(schoolId) },
		)),
		safeOptionalEntityList(() => listAllEntityPages(
			query => client.entities.classSubjects.list(query),
			{ baseQuery: { schoolId } },
		)),
	]);
	const assignments = (assignmentsRaw as TeacherAssignmentRaw[])
		.filter(assignment => assignment.kind === 'subject' && assignment.status === 'active' && assignment.classSubjectId)
		.map(assignment => ({
			id: assignment.id,
			teacherId: assignment.teacherId,
			classSubjectId: assignment.classSubjectId,
			classGroupId: assignment.classGroupId,
			subjectId: classSubjects.find(entry => entry.id === assignment.classSubjectId)?.subjectId,
			label: assignmentLabel(assignment, teachers, classSubjects as ClassSubjectRaw[], subjects as SubjectRaw[]),
		}));

	return {
		campaigns,
		teachers,
		staff,
		assignments,
		subjects: subjects as SubjectRaw[],
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

import type { FamilyFeedbackAudiencePreview } from '$lib/api/family-feedback-types';
import type { FamilyFeedbackPageState } from '../family-feedback-page.svelte';
import {
	createFamilyFeedbackCampaign,
	previewFamilyFeedbackAudience,
	runFamilyFeedbackCampaignCommand,
} from '$lib/api/family-feedback-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { academicContext } from '$lib/academic/context.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';
import { runFamilyFeedbackRouteMutation } from './family-feedback-route-mutation';

function client() {
	return getBrowserSchoolClient();
}

function yearId(): string | undefined {
	return academicContext.yearId || undefined;
}

export async function createFamilyFeedbackCampaignOnPage(
	state: FamilyFeedbackPageState,
	input: {
		academicPeriodId: string;
		teacherAssignmentId: string;
		opensAt?: string;
		closesAt?: string;
		moderatorStaffId?: string;
		successMessage?: string;
	},
): Promise<string | null> {
	const academicYearId = yearId();
	if (!academicYearId) {
		toast.error(get(t)('dataState.errorDescription'));
		return null;
	}

	const result = await runFamilyFeedbackRouteMutation({
		request: () => createFamilyFeedbackCampaign(client(), {
			academicYearId,
			academicPeriodId: input.academicPeriodId,
			teacherAssignmentId: input.teacherAssignmentId,
			opensAt: input.opensAt,
			closesAt: input.closesAt,
			moderatorStaffId: input.moderatorStaffId,
		}),
		successMessage: input.successMessage,
		onSuccess: (campaign) => {
			state.appendCampaign(campaign);
		},
	});
	return result?.id ?? null;
}

export async function updateFamilyFeedbackCampaignOnPage(
	state: FamilyFeedbackPageState,
	input: {
		id: string;
		opensAt?: string;
		closesAt?: string;
		successMessage?: string;
	},
): Promise<boolean> {
	const result = await runFamilyFeedbackRouteMutation({
		request: () => runFamilyFeedbackCampaignCommand(
			client(),
			'updateFamilyFeedbackCampaign',
			'update-family-feedback-campaign',
			{ id: input.id, opensAt: input.opensAt, closesAt: input.closesAt },
		),
		successMessage: input.successMessage,
		onSuccess: (campaign) => {
			state.patchCampaign(campaign.id, campaign);
		},
	});
	return Boolean(result);
}

export async function assignFamilyFeedbackModeratorOnPage(
	state: FamilyFeedbackPageState,
	input: { id: string; moderatorStaffId: string; successMessage?: string },
): Promise<boolean> {
	const result = await runFamilyFeedbackRouteMutation({
		request: () => runFamilyFeedbackCampaignCommand(
			client(),
			'assignFamilyFeedbackModerator',
			'assign-family-feedback-moderator',
			{ id: input.id, moderatorStaffId: input.moderatorStaffId },
		),
		successMessage: input.successMessage,
		onSuccess: (campaign) => {
			state.patchCampaign(campaign.id, campaign);
		},
	});
	return Boolean(result);
}

export async function saveFamilyFeedbackThemeDraftOnPage(
	state: FamilyFeedbackPageState,
	input: { id: string; themes: string; successMessage?: string },
): Promise<boolean> {
	const result = await runFamilyFeedbackRouteMutation({
		request: () => runFamilyFeedbackCampaignCommand(
			client(),
			'saveFamilyFeedbackThemeDraft',
			'save-family-feedback-theme-draft',
			{ id: input.id, themes: input.themes },
		),
		successMessage: input.successMessage,
		onSuccess: (campaign) => {
			state.patchCampaign(campaign.id, campaign);
		},
	});
	return Boolean(result);
}

async function runIdCommand(
	state: FamilyFeedbackPageState,
	method: string,
	publicName: string,
	id: string,
	successMessage?: string,
): Promise<boolean> {
	const result = await runFamilyFeedbackRouteMutation({
		request: () => runFamilyFeedbackCampaignCommand(client(), method, publicName, { id }),
		successMessage,
		onSuccess: (campaign) => {
			state.patchCampaign(campaign.id, campaign);
		},
	});
	return Boolean(result);
}

export function scheduleFamilyFeedbackCampaignOnPage(state: FamilyFeedbackPageState, id: string, successMessage?: string) {
	return runIdCommand(state, 'scheduleFamilyFeedbackCampaign', 'schedule-family-feedback-campaign', id, successMessage);
}

export function openFamilyFeedbackCampaignOnPage(state: FamilyFeedbackPageState, id: string, successMessage?: string) {
	return runIdCommand(state, 'openFamilyFeedbackCampaign', 'open-family-feedback-campaign', id, successMessage);
}

export function closeFamilyFeedbackCampaignOnPage(state: FamilyFeedbackPageState, id: string, successMessage?: string) {
	return runIdCommand(state, 'closeFamilyFeedbackCampaign', 'close-family-feedback-campaign', id, successMessage);
}

export function cancelFamilyFeedbackCampaignOnPage(state: FamilyFeedbackPageState, id: string, successMessage?: string) {
	return runIdCommand(state, 'cancelFamilyFeedbackCampaign', 'cancel-family-feedback-campaign', id, successMessage);
}

export function publishFamilyFeedbackCampaignOnPage(state: FamilyFeedbackPageState, id: string, successMessage?: string) {
	return runIdCommand(state, 'publishFamilyFeedbackCampaign', 'publish-family-feedback-campaign', id, successMessage);
}

export function archiveFamilyFeedbackCampaignOnPage(state: FamilyFeedbackPageState, id: string, successMessage?: string) {
	return runIdCommand(state, 'archiveFamilyFeedbackCampaign', 'archive-family-feedback-campaign', id, successMessage);
}

export async function previewAudienceOnPage(
	input: { academicPeriodId: string; teacherAssignmentId: string; id?: string; academicYearId?: string },
): Promise<FamilyFeedbackAudiencePreview | null> {
	const academicYearId = input.academicYearId || yearId();
	if (!academicYearId) {
		return null;
	}
	try {
		return await previewFamilyFeedbackAudience(client(), {
			id: input.id,
			academicYearId,
			academicPeriodId: input.academicPeriodId,
			teacherAssignmentId: input.teacherAssignmentId,
		});
	}
	catch {
		return null;
	}
}

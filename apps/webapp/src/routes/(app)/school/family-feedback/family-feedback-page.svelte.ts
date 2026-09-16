import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { StaffMember, Teacher } from '$lib/types/school';
import type {
	FamilyFeedbackAggregate,
	FamilyFeedbackAssignmentOption,
	FamilyFeedbackCampaign,
	FamilyFeedbackComment,
} from '$lib/api/family-feedback-types';
import type { components } from '$lib/api/schema';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readFamilyFeedbackListFilters, writeFamilyFeedbackListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getFamilyFeedbackAggregateReview, listFamilyFeedbackComments } from '$lib/api/family-feedback-data';
import { FAMILY_FEEDBACK_MODERATE_PERMISSION } from '$lib/family-feedback/permissions';
import { hasPermission } from '$lib/permissions';
import { queryClient } from '$lib/queries/client';
import { getContext, setContext } from 'svelte';
import {
	archiveFamilyFeedbackCampaignOnPage,
	assignFamilyFeedbackModeratorOnPage,
	cancelFamilyFeedbackCampaignOnPage,
	closeFamilyFeedbackCampaignOnPage,
	createFamilyFeedbackCampaignOnPage,
	openFamilyFeedbackCampaignOnPage,
	publishFamilyFeedbackCampaignOnPage,
	saveFamilyFeedbackThemeDraftOnPage,
	scheduleFamilyFeedbackCampaignOnPage,
	updateFamilyFeedbackCampaignOnPage,
} from './lib/family-feedback-detail-mutations';
import { familyFeedbackDetailIdFromUrl } from './lib/family-feedback-selectors';
import {
	ensureFamilyFeedbackDrawerSelection,
	loadFamilyFeedbackPageSlice,
	querySchoolFamilyFeedbackPage,
} from './lib/family-feedback-queries';

type SubjectRaw = components['schemas']['Subject'];

const FAMILY_FEEDBACK_VERSION_FAMILIES = ['familyFeedback'] as const satisfies readonly EntityVersionKey[];

const FAMILY_FEEDBACK_PAGE_STATE_KEY = Symbol('family-feedback-page-state');

export class FamilyFeedbackPageState {
	campaigns = $state<FamilyFeedbackCampaign[]>([]);
	teachers = $state<Teacher[]>([]);
	staff = $state<StaffMember[]>([]);
	assignments = $state<FamilyFeedbackAssignmentOption[]>([]);
	subjects = $state<SubjectRaw[]>([]);
	comments = $state<FamilyFeedbackComment[]>([]);
	aggregate = $state<FamilyFeedbackAggregate | undefined>(undefined);
	reviewCampaignId = $state<string | undefined>(undefined);

	readonly filters: ListFiltersState<{ q: string; status: string }>;

	private readonly versions = new RouteVersionSnapshot(FAMILY_FEEDBACK_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeFamilyFeedbackListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readFamilyFeedbackListFilters(getUrl()),
		);
	}

	get selectedId() {
		return familyFeedbackDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		const id = this.selectedId;
		if (!id) {
			return undefined;
		}
		return this.findCampaign(id);
	}

	findCampaign(id: string): FamilyFeedbackCampaign | undefined {
		return this.campaigns.find(campaign => campaign.id === id);
	}

	campaignTitle(campaign: FamilyFeedbackCampaign): string {
		return this.assignments.find(entry => entry.id === campaign.teacherAssignmentId)?.label
			?? campaign.teacherAssignmentId;
	}

	seed(data: {
		campaigns: FamilyFeedbackCampaign[];
		teachers: Teacher[];
		staff: StaffMember[];
		assignments: FamilyFeedbackAssignmentOption[];
		subjects: SubjectRaw[];
	}) {
		this.campaigns = data.campaigns;
		this.teachers = data.teachers;
		this.staff = data.staff;
		this.assignments = data.assignments;
		this.subjects = data.subjects;
		this.versions.markLoaded();
	}

	appendCampaign(campaign: FamilyFeedbackCampaign) {
		this.campaigns = [campaign, ...this.campaigns.filter(entry => entry.id !== campaign.id)];
	}

	patchCampaign(id: string, patch: Partial<FamilyFeedbackCampaign>) {
		this.campaigns = this.campaigns.map(campaign =>
			campaign.id === id ? { ...campaign, ...patch } : campaign,
		);
	}

	async loadComments(campaignId: string) {
		this.reviewCampaignId = campaignId;
		if (!hasPermission(FAMILY_FEEDBACK_MODERATE_PERMISSION)) {
			this.comments = [];
			return;
		}
		const comments = await listFamilyFeedbackComments(queryClient(), campaignId).catch(() => []);
		if (this.reviewCampaignId !== campaignId) {
			return;
		}
		this.comments = comments;
	}

	async loadAggregates(campaignId: string) {
		this.reviewCampaignId = campaignId;
		const campaign = this.findCampaign(campaignId);
		const aggregate = campaign && (campaign.status === 'closed' || campaign.status === 'published' || campaign.status === 'archived')
			? await getFamilyFeedbackAggregateReview(queryClient(), campaignId).catch(() => undefined)
			: undefined;
		if (this.reviewCampaignId !== campaignId) {
			return;
		}
		this.aggregate = aggregate;
	}

	async refreshSlice() {
		const data = await loadFamilyFeedbackPageSlice();
		this.seed(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	hydrateFiltersFromUrl() {
		this.filters.hydrate(readFamilyFeedbackListFilters(this.getUrl()));
	}

	queryListPage() {
		return querySchoolFamilyFeedbackPage(this);
	}

	ensureDrawerSelection(campaignId: string) {
		return ensureFamilyFeedbackDrawerSelection(this, campaignId);
	}

	createCampaign(...args: Parameters<typeof createFamilyFeedbackCampaignOnPage> extends [FamilyFeedbackPageState, ...infer R] ? R : never) {
		return createFamilyFeedbackCampaignOnPage(this, ...args);
	}

	updateCampaign(...args: Parameters<typeof updateFamilyFeedbackCampaignOnPage> extends [FamilyFeedbackPageState, ...infer R] ? R : never) {
		return updateFamilyFeedbackCampaignOnPage(this, ...args);
	}

	assignModerator(...args: Parameters<typeof assignFamilyFeedbackModeratorOnPage> extends [FamilyFeedbackPageState, ...infer R] ? R : never) {
		return assignFamilyFeedbackModeratorOnPage(this, ...args);
	}

	saveThemeDraft(...args: Parameters<typeof saveFamilyFeedbackThemeDraftOnPage> extends [FamilyFeedbackPageState, ...infer R] ? R : never) {
		return saveFamilyFeedbackThemeDraftOnPage(this, ...args);
	}

	scheduleCampaign(...args: Parameters<typeof scheduleFamilyFeedbackCampaignOnPage> extends [FamilyFeedbackPageState, ...infer R] ? R : never) {
		return scheduleFamilyFeedbackCampaignOnPage(this, ...args);
	}

	openCampaign(...args: Parameters<typeof openFamilyFeedbackCampaignOnPage> extends [FamilyFeedbackPageState, ...infer R] ? R : never) {
		return openFamilyFeedbackCampaignOnPage(this, ...args);
	}

	closeCampaign(...args: Parameters<typeof closeFamilyFeedbackCampaignOnPage> extends [FamilyFeedbackPageState, ...infer R] ? R : never) {
		return closeFamilyFeedbackCampaignOnPage(this, ...args);
	}

	cancelCampaign(...args: Parameters<typeof cancelFamilyFeedbackCampaignOnPage> extends [FamilyFeedbackPageState, ...infer R] ? R : never) {
		return cancelFamilyFeedbackCampaignOnPage(this, ...args);
	}

	publishCampaign(...args: Parameters<typeof publishFamilyFeedbackCampaignOnPage> extends [FamilyFeedbackPageState, ...infer R] ? R : never) {
		return publishFamilyFeedbackCampaignOnPage(this, ...args);
	}

	archiveCampaign(...args: Parameters<typeof archiveFamilyFeedbackCampaignOnPage> extends [FamilyFeedbackPageState, ...infer R] ? R : never) {
		return archiveFamilyFeedbackCampaignOnPage(this, ...args);
	}
}

export function setFamilyFeedbackPageState(state: FamilyFeedbackPageState) {
	setContext(FAMILY_FEEDBACK_PAGE_STATE_KEY, state);
}

export function getFamilyFeedbackPageState(): FamilyFeedbackPageState {
	return getContext<FamilyFeedbackPageState>(FAMILY_FEEDBACK_PAGE_STATE_KEY);
}

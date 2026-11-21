import type {
	FamilyFeedbackAggregate,
	FeedbackOption,
	FeedbackOptionsPage,
	FeedbackPicker,
	FamilyFeedbackCampaign,
	FamilyFeedbackComment,
} from '$lib/api/family-feedback-types';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { feedbackAssignmentTitle, feedbackClassNames, getFamilyFeedbackAggregateReview, listFamilyFeedbackComments, loadFeedbackOptions, loadStaffFeedbackCampaigns } from '$lib/api/family-feedback-data';
import { authSession } from '$lib/auth/session.svelte';
import { FAMILY_FEEDBACK_MODERATE_PERMISSION } from '$lib/family-feedback/permissions';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readFamilyFeedbackListFilters, writeFamilyFeedbackListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { hasPermission } from '$lib/permissions';
import { queryClient } from '$lib/queries/client';
import { ApiError } from '@maya-invest/edaya-api-client';
import { getContext, setContext } from 'svelte';
import {
	previewAudienceOnPage,
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
import { FamilyFeedbackHistory } from './lib/family-feedback-history.svelte';
import {
	ensureFamilyFeedbackDrawerSelection,

	querySchoolFamilyFeedbackPage,
} from './lib/family-feedback-queries';
import { familyFeedbackDetailIdFromUrl } from './lib/family-feedback-selectors';

const FAMILY_FEEDBACK_VERSION_FAMILIES = ['familyFeedback', 'teachers', 'staff', 'subjects'] as const satisfies readonly EntityVersionKey[];

const FAMILY_FEEDBACK_PAGE_STATE_KEY = Symbol('family-feedback-page-state');

export class FamilyFeedbackPageState {
	previewAudience = (...args: Parameters<typeof previewAudienceOnPage>) => previewAudienceOnPage(...args);
	private detail = $state<FamilyFeedbackCampaign>();
	private loadedScope = $state<string>();
	private classNames = $derived(feedbackClassNames());

	readonly history = new FamilyFeedbackHistory(() => ({
		...readFamilyFeedbackListFilters(this.getUrl()),
		academicYearId: academicContext.yearId || academicContext.years[0]?.id,
		lang: academicContext.uiLang,
		scope: this.optionScope,
	}), () => {
		this.clearDetail();
		this.clearOptions();
		if (!this.history.denied)
			this.detailReload++;
	});

	firstOptions = $state<FeedbackOptionsPage>();
	private chosen = $state<Partial<Record<FeedbackPicker, FeedbackOption>>>({});
	optionsStatus = $state<'loading' | 'ready' | 'error' | 'denied'>('loading');
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
		return this.loadedScope === this.optionScope && this.detail?.id === id ? this.detail : undefined;
	}

	campaignTitle(campaign: FamilyFeedbackCampaign): string {
		return feedbackAssignmentTitle(campaign.teacherAssignmentId, campaign.assignment, this.classNames);
	}

	readCampaign(id: string, signal?: AbortSignal) {
		return loadStaffFeedbackCampaigns(queryClient(), id, signal);
	}

	get optionScope() {
		return JSON.stringify([authSession.authUserId, authSession.userId, authSession.schoolId, academicContext.yearId, academicContext.scopeGeneration]);
	}

	clearOptions() {
		this.firstOptions = undefined;
		this.chosen = {};
		this.optionsStatus = 'loading';
	}

	findOption(picker: FeedbackPicker, id?: string) {
		if (!id) {
			return undefined;
		}
		const chosen = this.chosen[picker];
		return chosen?.id === id ? chosen : this.firstOptions?.[picker].find(option => option.id === id);
	}

	chooseOption(picker: FeedbackPicker, option: FeedbackOption) {
		this.chosen[picker] = option;
	}

	readOptions(picker: FeedbackPicker | 'both', signal: AbortSignal, q?: string, after?: string) {
		const academicYearId = academicContext.yearId || academicContext.years[0]?.id;
		return academicYearId
			? loadFeedbackOptions(queryClient(), { academicYearId, picker, q, after }, signal)
			: Promise.resolve({ assignments: [], moderators: [], nextAssignment: null, nextModerator: null } satisfies FeedbackOptionsPage);
	}

	handleOptionsDenial(error: unknown) {
		if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 403)) {
			return false;
		}
		this.clearOptions();
		this.optionsStatus = 'denied';
		return true;
	}

	async loadOptions(includeAssignments: boolean, signal: AbortSignal) {
		const scope = this.optionScope;
		this.clearOptions();
		try {
			const page = await this.readOptions(includeAssignments ? 'both' : 'moderators', signal);
			if (signal.aborted || scope !== this.optionScope) {
				return;
			}
			this.firstOptions = page;
			this.optionsStatus = 'ready';
		}
		catch (error) {
			if (!signal.aborted && scope === this.optionScope && !this.handleOptionsDenial(error))
				this.optionsStatus = 'error';
		}
	}

	appendCampaign(campaign: FamilyFeedbackCampaign) {
		this.detail = campaign;
		this.loadedScope = this.optionScope;
	}

	detailGeneration = 0;
	detailReload = $state(0);

	clearDetail() {
		this.detailGeneration++;
		this.detail = undefined;
		this.reviewCampaignId = undefined;
		this.comments = [];
		this.aggregate = undefined;
	}

	patchCampaign(id: string, patch: Partial<FamilyFeedbackCampaign>) {
		const current = this.findCampaign(id);
		if (!current)
			return;
		this.detail = { ...current, ...patch };
		if (this.detail.status !== current.status || this.detail.opensAt !== current.opensAt || this.detail.closesAt !== current.closesAt)
			void this.refreshSlice().catch(() => {});
	}

	async loadComments(campaignId: string) {
		const scope = this.optionScope;
		this.reviewCampaignId = campaignId;
		if (!hasPermission(FAMILY_FEEDBACK_MODERATE_PERMISSION)) {
			this.comments = [];
			return;
		}
		const comments = await listFamilyFeedbackComments(queryClient(), campaignId).catch(() => []);
		if (this.reviewCampaignId !== campaignId || scope !== this.optionScope) {
			return;
		}
		this.comments = comments;
	}

	async loadAggregates(campaignId: string) {
		const scope = this.optionScope;
		this.reviewCampaignId = campaignId;
		const campaign = this.findCampaign(campaignId);
		const aggregate = campaign && (campaign.status === 'closed' || campaign.status === 'published' || campaign.status === 'archived')
			? await getFamilyFeedbackAggregateReview(queryClient(), campaignId).catch(() => undefined)
			: undefined;
		if (this.reviewCampaignId !== campaignId || scope !== this.optionScope) {
			return;
		}
		this.aggregate = aggregate;
	}

	async refreshSlice(signal?: AbortSignal) {
		const version = this.versions.capture();
		if (await this.history.refresh(signal))
			this.versions.markLoaded(version);
	}

	async invalidateIfStale() {
		if (!this.versions.hasLoaded() || !this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
		const selected = this.selectedId;
		if (selected && this.findCampaign(selected)) {
			this.clearDetail();
			this.detailReload++;
		}
	}

	hydrateFiltersFromUrl() {
		this.filters.hydrate(readFamilyFeedbackListFilters(this.getUrl()));
	}

	queryListPage() {
		return querySchoolFamilyFeedbackPage(this);
	}

	async ensureDrawerSelection(campaignId: string, signal?: AbortSignal) {
		const { bootstrapAppShell } = await import('$lib/auth/bootstrap-app');
		await bootstrapAppShell();
		signal?.throwIfAborted();
		return ensureFamilyFeedbackDrawerSelection(this, campaignId, signal);
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

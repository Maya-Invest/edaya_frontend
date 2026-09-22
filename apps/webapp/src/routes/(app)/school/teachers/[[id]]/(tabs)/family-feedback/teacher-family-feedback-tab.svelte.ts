import type { FamilyFeedbackCampaign } from '$lib/api/family-feedback-types';
import type { PageQueryRequest } from '../../../lib/teacher-page-status';
import type { TeachersPageState } from '../../../teachers-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { listFamilyFeedbackCampaigns } from '$lib/api/family-feedback-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { getContext, setContext } from 'svelte';
import { resolveTeacherPageLoad } from '../../../lib/teacher-page-status';
import { teacherDetailIdFromUrl } from '../../../lib/teacher-selectors';

const TEACHER_FAMILY_FEEDBACK_TAB_KEY = Symbol('teacher-family-feedback-tab');

export interface TeacherFamilyFeedbackTabSlice {
	teacherId: string;
	campaigns: FamilyFeedbackCampaign[];
}

export class TeacherFamilyFeedbackTabState {
	slice = $state<TeacherFamilyFeedbackTabSlice | null>(null);

	constructor(private readonly getPage: () => TeachersPageState) {}

	clear() {
		this.slice = null;
	}

	campaignsFor(teacherId: string): FamilyFeedbackCampaign[] {
		return this.slice?.teacherId === teacherId ? this.slice.campaigns : [];
	}

	query() {
		return (url: URL, request?: PageQueryRequest) => resolveTeacherPageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				const teacherId = teacherDetailIdFromUrl(url);
				if (!teacherId) {
					return {};
				}
				this.getPage();
				const yearId = academicContext.yearId;
				const campaigns = await listFamilyFeedbackCampaigns(getBrowserSchoolClient());
				signal.throwIfAborted();
				this.slice = {
					teacherId,
					campaigns: campaigns.filter(campaign =>
						campaign.teacherId === teacherId && (!yearId || campaign.academicYearId === yearId)),
				};
				return {};
			},
			hasItems: () => true,
			errorMessage: 'Unable to load family feedback campaigns.',
		}, request);
	}
}

export function setTeacherFamilyFeedbackTabState(state: TeacherFamilyFeedbackTabState) {
	setContext(TEACHER_FAMILY_FEEDBACK_TAB_KEY, state);
}

export function getTeacherFamilyFeedbackTabState() {
	return getContext<TeacherFamilyFeedbackTabState>(TEACHER_FAMILY_FEEDBACK_TAB_KEY);
}

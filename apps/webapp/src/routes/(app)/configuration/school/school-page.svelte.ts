import type { SchoolRaw } from '$lib/api/school-data';
import type { PageQueryRequest } from '$lib/queries/page-status';
import type { School } from '$lib/types/school';
import type { SchoolPageSlice } from './lib/school-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { listAllEntityPages } from '$lib/api/entity-list-filters';
import { clearSchoolIssuanceAssetMutation, uploadSchoolIssuanceAssetMutation } from '$lib/api/mutations/issuance-asset.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { mapSchoolFromApi } from '$lib/api/school-data';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getContext, setContext } from 'svelte';
import { loadSchoolSlice, querySchoolListPage } from './lib/school-queries';
import { runSchoolRouteMutation } from './lib/school-route-mutation';

const SCHOOL_VERSION_FAMILIES = ['school', 'documents'] as const;
const SCHOOL_PAGE_STATE_KEY = Symbol('school-page-state');
export type { SchoolPageSlice };
export type PublicBrandingPurpose = 'school.logo' | 'school.crest';
export class SchoolPageState {
    performUploadSchoolIssuanceAsset = (...args: Parameters<typeof uploadSchoolIssuanceAssetMutation>) => uploadSchoolIssuanceAssetMutation(...args);
    performClearSchoolIssuanceAsset = (...args: Parameters<typeof clearSchoolIssuanceAssetMutation>) => clearSchoolIssuanceAssetMutation(...args);
    slice = $state<SchoolPageSlice | null>(null);
    private readonly versions = new RouteVersionSnapshot(SCHOOL_VERSION_FAMILIES);
    applySlice(data: SchoolPageSlice) {
        this.slice = data;
        this.versions.markLoaded();
    }

    clear() {
        this.slice = null;
    }

    get school() {
        return this.slice?.school ?? null;
    }

    get raw() {
        return this.slice?.raw ?? null;
    }

    applyProfile(data: {
        school: School;
        raw: SchoolRaw;
    }) {
        this.slice = data;
    }

    queryListPage() {
        return querySchoolListPage(this);
    }

    async refreshSlice() {
        const data = await loadSchoolSlice();
        this.applySlice(data);
    }

    async invalidateIfStale() {
        if (!this.versions.isStale()) {
            return;
        }
        await this.refreshSlice();
    }

    periodChoices = $state<{
        id: string;
        label: string;
    }[]>([]);

    periodChoicesQuery = (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
        empty: () => ({}),
        hasItems: () => true,
        load: async (signal) => {
            const schoolId = this.raw?.id;
            if (!schoolId)
                return {};
            const rows = await listAllEntityPages(query => getBrowserSchoolClient().entities.periodDefinitions.list(query), { baseQuery: { schoolId } });
            signal.throwIfAborted();
            if (schoolId === this.raw?.id)
                this.periodChoices = rows.map(row => ({ id: row.id, label: `${row.name} · ${row.startTime}–${row.endTime}` }));
            return {};
        },
    }, request);

    async updateSettings(input: Partial<Pick<SchoolRaw, 'name' | 'shortName' | 'timeZone' | 'financeCurrency' | 'city' | 'country' | 'issuingName' | 'postalAddress' | 'phone' | 'email' | 'schoolCode' | 'publicBrandingPurposes' | 'enforceScheduleConflicts' | 'timetableEnforceWorkloadFulfillment' | 'timetableExcludeBreakSlots' | 'timetableMinDayGapSameSubject' | 'timetablePreferredPeriodDefinitionIds' | 'timetableAllowUnassignedTeacherPlacements' | 'timetableUseHomeroomTeacherFallback' | 'timetableGenerationMode' | 'timetableMinPeriodSpan' | 'timetableMaxPeriodSpan'>> & {
        successMessage?: string;
    }): Promise<boolean> {
        const current = this.raw;
        if (!current)
            return false;
        const { successMessage, ...fields } = input;
        const patch = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
        const result = await runSchoolRouteMutation({
            request: async () => {
                const saved = await getBrowserSchoolClient().commands.updateSchoolConfiguration({ schoolId: current.id, ...patch });
                return { school: mapSchoolFromApi(saved), raw: saved };
            },
            successMessage,
            onSuccess: (data) => {
                academicContext.updateSchool(data.school);
                this.applyProfile(data);
            },
        });
        return result !== null;
    }

    updatePublicBranding(purposes: PublicBrandingPurpose[]) {
        return this.updateSettings({ publicBrandingPurposes: purposes });
    }
}
export function setSchoolPageState(state: SchoolPageState) {
    setContext(SCHOOL_PAGE_STATE_KEY, state);
}
export function getSchoolPageState() {
    return getContext<SchoolPageState>(SCHOOL_PAGE_STATE_KEY);
}

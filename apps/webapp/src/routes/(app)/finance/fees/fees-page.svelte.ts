import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { PageQueryRequest } from '$lib/queries/page-status';
import type { Fee } from '$lib/types/school';
import type { FeesPageSlice } from './lib/fees-helpers';
import { academicContext } from '$lib/academic/context.svelte';
import { catalogServicesEntity } from '$lib/api/finance-client';
import { mapFees } from '$lib/api/finance-data';
import { financeReadKey, readFinanceOverview } from '$lib/api/finance-workspace';
import { enrollStudentInServiceMutation, enrollStudentsInServiceMutation } from '$lib/api/mutations/billing.mutations';
import { activateCatalogServiceMutation, archiveCatalogServiceMutation, createCatalogServiceMutation, updateCatalogServiceMutation } from '$lib/api/mutations/fee.mutations';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getContext, setContext } from 'svelte';
import { loadFeesSlice, queryFeesListPage } from './lib/fees-queries';

const FEES_VERSION_FAMILIES = ['fees', 'billing', 'payments'] as const satisfies readonly EntityVersionKey[];
const FEES_PAGE_STATE_KEY = Symbol('fees-page-state');
export type { FeesPageSlice };
export class FeesPageState {
    slice = $state<FeesPageSlice | null>(null);
    detail = $state<Fee | null>(null);
    get billing() {
        return [];
    }

    studentFor(_id: string): undefined {
        return undefined;
    }

    async enrollStudent(input: Parameters<typeof enrollStudentInServiceMutation>[0]) {
        return enrollStudentInServiceMutation(input);
    }

    async enrollStudents(input: Parameters<typeof enrollStudentsInServiceMutation>[0]) {
        return enrollStudentsInServiceMutation(input);
    }

    queryDetail(id: () => string) {
        return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
            empty: () => ({ fee: null as Fee | null }),
            load: async (signal) => {
                const year = academicContext.yearId;
                const raw = await catalogServicesEntity(getBrowserSchoolClient()).get(id());
                signal.throwIfAborted();
                const fee = mapFees([raw])[0] ?? null;
                if (fee?.academicYearId !== year)
                    throw new Error('Fee not found');
                this.detail = fee;
                return { fee };
            },
            hasItems: data => Boolean(data.fee),
        }, request);
    }

    private readonly versions = new RouteVersionSnapshot(FEES_VERSION_FAMILIES);
    applySlice(data: FeesPageSlice) {
        this.slice = data;
        this.versions.markLoaded();
    }

    clear() {
        this.slice = null;
        this.detail = null;
    }

    get fees() {
        const fees = this.slice?.fees ?? [];
        return this.detail && !fees.some(fee => fee.id === this.detail?.id) ? [...fees, this.detail] : fees;
    }

    feeFor(id: string) {
        return this.detail?.id === id ? this.detail : this.fees.find(fee => fee.id === id);
    }

    appendFee(fee: Fee) {
        if (!this.slice) {
            return;
        }
        this.slice = {
            ...this.slice,
            fees: [fee, ...this.slice.fees.filter(entry => entry.id !== fee.id)],
        };
    }

    patchFee(id: string, patch: Partial<Fee>) {
        if (this.detail?.id === id)
            this.detail = { ...this.detail, ...patch };
        if (!this.slice) {
            return;
        }
        this.slice = {
            ...this.slice,
            fees: this.slice.fees.map(fee => fee.id === id ? { ...fee, ...patch } : fee),
        };
    }

    removeFee(id: string) {
        if (!this.slice) {
            return;
        }
        this.slice = {
            ...this.slice,
            fees: this.slice.fees.filter(fee => fee.id !== id),
        };
    }

    queryOverview(feeId?: string) {
        return (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
            empty: () => ({ overview: null as Awaited<ReturnType<typeof readFinanceOverview>> | null }),
            load: async (signal) => {
                const overview = await readFinanceOverview(feeId);
                signal.throwIfAborted();
                return { overview };
            },
            hasItems: () => true,
        }, request);
    }

    queryListPage() {
        return queryFeesListPage(this);
    }

    async refreshSlice() {
        const key = financeReadKey('fees');
        const data = await loadFeesSlice();
        if (key === financeReadKey('fees'))
            this.applySlice(data);
    }

    async invalidateIfStale() {
        if (!this.versions.isStale()) {
            return;
        }
        await this.refreshSlice();
    }

    async createFee(input: {
        name: string;
        description?: string | null;
        billingTerms?: Fee['billingTerms'];
        category: Fee['category'];
        amount: number;
        currency?: string;
        enrollmentMode?: Fee['enrollmentMode'];
        successMessage?: string;
    }): Promise<string | null> {
        const id = await createCatalogServiceMutation({
            name: input.name,
            description: input.description,
            billingTerms: input.billingTerms,
            category: input.category,
            amount: input.amount,
            currency: input.currency,
            enrollmentMode: input.enrollmentMode,
            status: 'active',
            successMessage: input.successMessage,
        });
        if (id) {
            this.appendFee({
                id,
                name: input.name.trim(),
                description: input.description ?? undefined,
                billingTerms: input.billingTerms,
                category: input.category,
                amount: input.amount,
                currency: input.currency?.trim() || authSession.school?.financeCurrency || '',
                status: 'active',
                enrollmentMode: input.enrollmentMode ?? 'mandatory',
                installmentCount: input.billingTerms?.installments?.length ?? 0,
            });
        }
        return id;
    }

    async updateFee(input: {
        feeId: string;
        name: string;
        description?: string | null;
        billingTerms?: Fee['billingTerms'];
        category: Fee['category'];
        amount: number;
        enrollmentMode?: Fee['enrollmentMode'];
        successMessage?: string;
    }): Promise<boolean> {
        const previous = this.feeFor(input.feeId);
        const ok = await updateCatalogServiceMutation({
            id: input.feeId,
            name: input.name,
            description: input.description,
            billingTerms: input.billingTerms,
            category: input.category,
            amount: input.amount,
            enrollmentMode: input.enrollmentMode,
            successMessage: input.successMessage,
        });
        if (ok) {
            this.patchFee(input.feeId, {
                name: input.name.trim(),
                description: input.description ?? undefined,
                billingTerms: input.billingTerms,
                category: input.category,
                amount: input.amount,
                enrollmentMode: input.enrollmentMode ?? previous?.enrollmentMode,
            });
        }
        return ok;
    }

    async activateFee(input: {
        feeId: string;
        successMessage?: string;
    }): Promise<boolean> {
        const ok = await activateCatalogServiceMutation({
            id: input.feeId,
            successMessage: input.successMessage,
        });
        if (ok) {
            this.patchFee(input.feeId, { status: 'active' });
        }
        return ok;
    }

    async archiveFee(input: {
        feeId: string;
        successMessage?: string;
    }): Promise<boolean> {
        const ok = await archiveCatalogServiceMutation({
            id: input.feeId,
            successMessage: input.successMessage,
        });
        if (ok) {
            this.patchFee(input.feeId, { status: 'archived' });
        }
        return ok;
    }
}
export function setFeesPageState(state: FeesPageState) {
    setContext(FEES_PAGE_STATE_KEY, state);
}
export function getFeesPageState() {
    return getContext<FeesPageState>(FEES_PAGE_STATE_KEY);
}

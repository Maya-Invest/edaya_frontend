import type { components } from '$lib/api/schema';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { AnnouncementListFilters } from '$lib/list/list-url-filters';
import type { PageQueryRequest } from '$lib/queries/page-status';
import type { Announcement, AnnouncementTarget } from '$lib/types/school';
import { academicContext } from '$lib/academic/context.svelte';
import { deliveryRecipientName, emptyAnnouncementPeople, fetchAnnouncementPeople } from '$lib/api/announcements-data';
import { listAllEntityPages } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readAnnouncementListFilters, writeAnnouncementListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getContext, setContext } from 'svelte';
import { addAnnouncementTargetOnPage, createAnnouncementOnPage, deleteAnnouncementOnPage, publishAnnouncementOnPage, removeAnnouncementTargetOnPage, updateAnnouncementOnPage } from './lib/announcement-detail-mutations';
import { announcementDetailIdFromUrl } from './lib/announcement-selectors';
import { ensureAnnouncementDrawerSelection, loadAnnouncementsSlice, querySchoolAnnouncementsPage } from './lib/announcements-queries';

const ANNOUNCEMENTS_VERSION_FAMILIES = ['announcements'] as const satisfies readonly EntityVersionKey[];
const ANNOUNCEMENTS_PAGE_STATE_KEY = Symbol('announcements-page-state');
export class AnnouncementsPageState {
    queryDeliveries = (announcementId: string, url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
        empty: () => ({ deliveries: [] as (components['schemas']['MessageDelivery'] & { recipientName?: string })[] }),
        hasItems: () => true,
        load: async (signal) => {
            const client = getBrowserSchoolClient();
            const schoolId = authSession.schoolId ?? '';
            const yearId = academicContext.yearId;
            const deliveries = await listAllEntityPages(query => client.entities.messageDeliveries.list(query), { baseQuery: { announcementId }, signal });
            signal.throwIfAborted();
            const refs = deliveries.map(row => ({ kind: row.recipientKind, id: row.recipientId }));
            const people = await fetchAnnouncementPeople(client, schoolId, yearId, refs, signal).catch(() => emptyAnnouncementPeople());
            signal.throwIfAborted();
            return { deliveries: deliveries.map((row, index) => ({ ...row, recipientName: deliveryRecipientName(refs[index]!, people) })) };
        },
    }, request);

    announcements = $state<Announcement[]>([]);
    targetPeople = $state.raw(emptyAnnouncementPeople());

    watchTargetPeople(targets: readonly AnnouncementTarget[]) {
        const schoolId = authSession.schoolId ?? '';
        const yearId = academicContext.yearId;
        const grants = authSession.grants;
        const generation = academicContext.scopeGeneration;
        const actor = authSession.userId;
        const controller = new AbortController();
        const refs = targets.map(target => ({ kind: target.targetKind, id: target.targetId }));
        this.targetPeople = emptyAnnouncementPeople();
        if (schoolId && grants && actor) {
            void fetchAnnouncementPeople(getBrowserSchoolClient(), schoolId, yearId, refs, controller.signal).then((people) => {
                if (!controller.signal.aborted && generation === academicContext.scopeGeneration && grants === authSession.grants && schoolId === authSession.schoolId && actor === authSession.userId) {
                    this.targetPeople = people;
                }
            }).catch(() => { /* Optional labels fall back to the authorized target ID. */ });
        }
        return () => controller.abort();
    }

    readonly filters: ListFiltersState<AnnouncementListFilters>;

    private readonly versions = new RouteVersionSnapshot(ANNOUNCEMENTS_VERSION_FAMILIES);
    constructor(private readonly getUrl: () => URL) {
        this.filters = new ListFiltersState({
            getUrl,
            write: writeAnnouncementListFilters,
            goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
        }, () => readAnnouncementListFilters(getUrl()));
    }

    get selectedId() {
        return announcementDetailIdFromUrl(this.getUrl());
    }

    get selected() {
        const id = this.selectedId;
        if (!id) {
            return undefined;
        }
        return this.findAnnouncement(id);
    }

    findAnnouncement(id: string): Announcement | undefined {
        return this.announcements.find(announcement => announcement.id === id);
    }

    seed(data: { announcements: Announcement[] }) {
        this.announcements = data.announcements;
        this.versions.markLoaded();
    }

    appendAnnouncement(announcement: Announcement) {
        this.announcements = [announcement, ...this.announcements.filter(entry => entry.id !== announcement.id)];
    }

    removeAnnouncement(id: string) {
        this.announcements = this.announcements.filter(announcement => announcement.id !== id);
    }

    patchAnnouncement(id: string, patch: Partial<Announcement>) {
        this.announcements = this.announcements.map(announcement => announcement.id === id ? { ...announcement, ...patch } : announcement);
    }

    appendAnnouncementTarget(announcementId: string, target: AnnouncementTarget) {
        this.announcements = this.announcements.map((announcement) => {
            if (announcement.id !== announcementId) {
                return announcement;
            }
            return {
                ...announcement,
                targets: [...announcement.targets.filter(entry => entry.id !== target.id), target],
            };
        });
    }

    removeAnnouncementTarget(announcementId: string, targetId: string) {
        this.announcements = this.announcements.map((announcement) => {
            if (announcement.id !== announcementId) {
                return announcement;
            }
            return {
                ...announcement,
                targets: announcement.targets.filter(target => target.id !== targetId),
            };
        });
    }

    async refreshSlice() {
        const data = await loadAnnouncementsSlice();
        this.seed(data);
    }

    async invalidateIfStale() {
        if (!this.versions.hasLoaded() || !this.versions.isStale()) {
            return;
        }
        await this.refreshSlice();
    }

    hydrateFiltersFromUrl() {
        this.filters.hydrate(readAnnouncementListFilters(this.getUrl()));
    }

    queryListPage() {
        return querySchoolAnnouncementsPage(this);
    }

    ensureDrawerSelection(announcementId: string) {
        return ensureAnnouncementDrawerSelection(this, announcementId);
    }

    createAnnouncement(...args: Parameters<typeof createAnnouncementOnPage> extends [
        AnnouncementsPageState,
        ...infer R,
    ] ? R : never) {
        return createAnnouncementOnPage(this, ...args);
    }

    updateAnnouncement(...args: Parameters<typeof updateAnnouncementOnPage> extends [
        AnnouncementsPageState,
        ...infer R,
    ] ? R : never) {
        return updateAnnouncementOnPage(this, ...args);
    }

    addTarget(...args: Parameters<typeof addAnnouncementTargetOnPage> extends [
        AnnouncementsPageState,
        ...infer R,
    ] ? R : never) {
        return addAnnouncementTargetOnPage(this, ...args);
    }

    removeTarget(...args: Parameters<typeof removeAnnouncementTargetOnPage> extends [
        AnnouncementsPageState,
        ...infer R,
    ] ? R : never) {
        return removeAnnouncementTargetOnPage(this, ...args);
    }

    publishAnnouncement(...args: Parameters<typeof publishAnnouncementOnPage> extends [
        AnnouncementsPageState,
        ...infer R,
    ] ? R : never) {
        return publishAnnouncementOnPage(this, ...args);
    }

    deleteAnnouncement(...args: Parameters<typeof deleteAnnouncementOnPage> extends [
        AnnouncementsPageState,
        ...infer R,
    ] ? R : never) {
        return deleteAnnouncementOnPage(this, ...args);
    }
}
export function setAnnouncementsPageState(state: AnnouncementsPageState) {
    setContext(ANNOUNCEMENTS_PAGE_STATE_KEY, state);
}
export function getAnnouncementsPageState(): AnnouncementsPageState {
    return getContext<AnnouncementsPageState>(ANNOUNCEMENTS_PAGE_STATE_KEY);
}

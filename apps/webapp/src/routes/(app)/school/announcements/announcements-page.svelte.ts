import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { Announcement, AnnouncementTarget, Guardian, StaffMember, Student } from '$lib/types/school';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { readAnnouncementListFilters, writeAnnouncementListFilters } from '$lib/list/list-url-filters';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import {
	addAnnouncementTargetOnPage,
	createAnnouncementOnPage,
	deleteAnnouncementOnPage,
	publishAnnouncementOnPage,
	updateAnnouncementOnPage,
} from './lib/announcement-detail-mutations';
import { announcementDetailIdFromUrl } from './lib/announcement-selectors';
import {
	ensureAnnouncementDrawerSelection,
	loadAnnouncementsSlice,
	querySchoolAnnouncementsPage,
} from './lib/announcements-queries';

const ANNOUNCEMENTS_VERSION_FAMILIES = ['announcements'] as const satisfies readonly EntityVersionKey[];

const ANNOUNCEMENTS_PAGE_STATE_KEY = Symbol('announcements-page-state');

export class AnnouncementsPageState {
	announcements = $state<Announcement[]>([]);
	guardians = $state<Guardian[]>([]);
	staff = $state<StaffMember[]>([]);
	students = $state<Student[]>([]);

	readonly filters: ListFiltersState<{ q: string; status: string }>;

	private readonly versions = new RouteVersionSnapshot(ANNOUNCEMENTS_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeAnnouncementListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readAnnouncementListFilters(getUrl()),
		);
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

	seed(data: {
		announcements: Announcement[];
		guardians: Guardian[];
		staff: StaffMember[];
		students: Student[];
	}) {
		this.announcements = data.announcements;
		this.guardians = data.guardians;
		this.staff = data.staff;
		this.students = data.students;
		this.versions.markLoaded();
	}

	appendAnnouncement(announcement: Announcement) {
		this.announcements = [announcement, ...this.announcements.filter(entry => entry.id !== announcement.id)];
	}

	removeAnnouncement(id: string) {
		this.announcements = this.announcements.filter(announcement => announcement.id !== id);
	}

	patchAnnouncement(id: string, patch: Partial<Announcement>) {
		this.announcements = this.announcements.map(announcement =>
			announcement.id === id ? { ...announcement, ...patch } : announcement,
		);
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
		if (!this.versions.isStale()) {
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

	createAnnouncement(...args: Parameters<typeof createAnnouncementOnPage> extends [AnnouncementsPageState, ...infer R] ? R : never) {
		return createAnnouncementOnPage(this, ...args);
	}

	updateAnnouncement(...args: Parameters<typeof updateAnnouncementOnPage> extends [AnnouncementsPageState, ...infer R] ? R : never) {
		return updateAnnouncementOnPage(this, ...args);
	}

	addTarget(...args: Parameters<typeof addAnnouncementTargetOnPage> extends [AnnouncementsPageState, ...infer R] ? R : never) {
		return addAnnouncementTargetOnPage(this, ...args);
	}

	publishAnnouncement(...args: Parameters<typeof publishAnnouncementOnPage> extends [AnnouncementsPageState, ...infer R] ? R : never) {
		return publishAnnouncementOnPage(this, ...args);
	}

	deleteAnnouncement(...args: Parameters<typeof deleteAnnouncementOnPage> extends [AnnouncementsPageState, ...infer R] ? R : never) {
		return deleteAnnouncementOnPage(this, ...args);
	}
}

export function setAnnouncementsPageState(state: AnnouncementsPageState) {
	setContext(ANNOUNCEMENTS_PAGE_STATE_KEY, state);
}

export function getAnnouncementsPageState(): AnnouncementsPageState {
	return getContext<AnnouncementsPageState>(ANNOUNCEMENTS_PAGE_STATE_KEY);
}

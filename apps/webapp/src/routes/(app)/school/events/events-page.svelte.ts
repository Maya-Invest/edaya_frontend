import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { Incident, Student } from '$lib/types/school';
import { runRouteMutation } from '$lib/api/mutations/route-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadIncidentInvolvements, loadIncidentSanctions, loadIncidentResolveModalData } from '$lib/api/school-life-data';
import { ListFiltersState } from '$lib/list/list-filters-state.svelte';
import { appGoto } from '$lib/navigation/app-navigation';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { resolvePageLoad } from '$lib/queries/page-status';
import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { incidentDetailIdFromUrl } from './lib/event-selectors';
import {
	readEventsListFilters,
	writeEventsListFilters,
} from './lib/events-list-filters';
import {
	ensureIncidentDrawerSelection,
	loadEventsSlice,
	querySchoolEventsPage,
} from './lib/events-queries';
import {
	createIncidentOnPage,
	deleteIncidentOnPage,
	resolveIncidentWithOutcomesOnPage,
	updateIncidentOnPage,
} from './lib/incident-detail-mutations';

const EVENTS_VERSION_FAMILIES = ['incidents', 'students'] as const satisfies readonly EntityVersionKey[];

const EVENTS_PAGE_STATE_KEY = Symbol('events-page-state');

export class EventsPageState {
    involvements = $state<Awaited<ReturnType<typeof loadIncidentInvolvements>>>([]);
    sanctions = $state<Awaited<ReturnType<typeof loadIncidentSanctions>>>([]);
    detailLoading = $state(false);
    private detailGeneration = 0;
    async refreshDetail(incidentId: string) {
        const generation = ++this.detailGeneration;
        this.detailLoading = true;
        const client = getBrowserSchoolClient();
        const names = new SvelteMap(this.students.map(student => [student.id, student.name]));
        try {
            const [involvements, sanctions] = await Promise.all([
                loadIncidentInvolvements(client, incidentId),
loadIncidentSanctions(client, incidentId, names),
            ]);
            if (generation === this.detailGeneration && incidentId === this.selectedId) {
                this.involvements = involvements;
                this.sanctions = sanctions;
            }
        }
 finally {
 if (generation === this.detailGeneration)
this.detailLoading = false;
}
    }

    queryDetail = (url: URL) => resolvePageLoad(url, {
        empty: () => ({}),
        load: async () => {
            const id = incidentDetailIdFromUrl(url);
            if (id) {
                await this.ensureDrawerSelection(id);
                await this.refreshDetail(id);
            }
            return {};
        },
        hasItems: () => true,
    });

	loadIncidentResolution = (...args: Parameters<typeof loadIncidentResolveModalData> extends [unknown, ...infer Rest] ? Rest : never) => loadIncidentResolveModalData(getBrowserSchoolClient(), ...args);

	async takeOverIncident(incidentId: string): Promise<boolean> {
		return await runRouteMutation({ request: () => getBrowserSchoolClient().commands.takeOverTeacherIncident({ requestId: crypto.randomUUID(), incidentId }), versionKeys: ['incidents'], onSuccess: () => this.refreshSlice() }) !== null;
	}

	incidents = $state<Incident[]>([]);
	students = $state<Student[]>([]);

	readonly filters: ListFiltersState<{
		q: string;
		class: string;
		category: string;
		severity: string;
		status: string;
	}>;

	private readonly versions = new RouteVersionSnapshot(EVENTS_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {
		this.filters = new ListFiltersState(
			{
				getUrl,
				write: writeEventsListFilters,
				goto: href => appGoto(href, { replaceState: true, keepFocus: true, noScroll: true }),
			},
			() => readEventsListFilters(getUrl()),
		);
	}

	get selectedId() {
		return incidentDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		const id = this.selectedId;
		if (!id) {
			return undefined;
		}
		return this.findIncident(id);
	}

	findIncident(id: string): Incident | undefined {
		return this.incidents.find(incident => incident.id === id);
	}

	seed(data: { incidents: Incident[]; students: Student[] }) {
		this.incidents = data.incidents;
		this.students = data.students;
		this.versions.markLoaded();
	}

	appendIncident(incident: Incident) {
		this.incidents = [incident, ...this.incidents.filter(entry => entry.id !== incident.id)];
	}

	removeIncident(id: string) {
		this.incidents = this.incidents.filter(incident => incident.id !== id);
	}

	patchIncident(id: string, patch: Partial<Incident>) {
		this.incidents = this.incidents.map(incident =>
			incident.id === id ? { ...incident, ...patch } : incident,
		);
	}

	async refreshSlice() {
		const data = await loadEventsSlice();
		this.seed(data);
	}

	async invalidateIfStale() {
		if (!this.versions.isStale()) {
			return;
		}
		await this.refreshSlice();
	}

	queryListPage() {
		return querySchoolEventsPage(this);
	}

	ensureDrawerSelection(incidentId: string) {
		return ensureIncidentDrawerSelection(this, incidentId);
	}

	createIncident(...args: Parameters<typeof createIncidentOnPage> extends [EventsPageState, ...infer R] ? R : never) {
		return createIncidentOnPage(this, ...args);
	}

	updateIncident(...args: Parameters<typeof updateIncidentOnPage> extends [EventsPageState, ...infer R] ? R : never) {
		return updateIncidentOnPage(this, ...args);
	}

	resolveIncidentWithOutcomes(...args: Parameters<typeof resolveIncidentWithOutcomesOnPage> extends [EventsPageState, ...infer R] ? R : never) {
		return resolveIncidentWithOutcomesOnPage(this, ...args);
	}

	deleteIncident(...args: Parameters<typeof deleteIncidentOnPage> extends [EventsPageState, ...infer R] ? R : never) {
		return deleteIncidentOnPage(this, ...args);
	}
}

export function setEventsPageState(state: EventsPageState) {
	setContext(EVENTS_PAGE_STATE_KEY, state);
}

export function getEventsPageState(): EventsPageState {
	return getContext<EventsPageState>(EVENTS_PAGE_STATE_KEY);
}

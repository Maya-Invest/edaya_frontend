import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { Incident, Student } from '$lib/types/school';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { getContext, setContext } from 'svelte';
import {
	createIncidentOnPage,
	deleteIncidentOnPage,
	resolveIncidentWithOutcomesOnPage,
	updateIncidentOnPage,
} from './lib/incident-detail-mutations';
import { incidentDetailIdFromUrl } from './lib/event-selectors';
import {
	ensureIncidentDrawerSelection,
	loadEventsSlice,
	querySchoolEventsPage,
} from './lib/events-queries';

const EVENTS_VERSION_FAMILIES = ['incidents'] as const satisfies readonly EntityVersionKey[];

const EVENTS_PAGE_STATE_KEY = Symbol('events-page-state');

export class EventsPageState {
	incidents = $state<Incident[]>([]);
	students = $state<Student[]>([]);

	private readonly versions = new RouteVersionSnapshot(EVENTS_VERSION_FAMILIES);

	constructor(private readonly getUrl: () => URL) {}

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

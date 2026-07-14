import type { components } from '$lib/api/schema';
import type { SchoolYearEvent } from '$lib/types/school';
import type { CalendarPageState } from '../calendar-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { toast } from '$lib/toast.svelte';
import { get } from 'svelte/store';
import { runCalendarRouteMutation } from './calendar-route-mutation';

type ApiCalendarEvent = components['schemas']['CalendarEvent'];
type ApiKind = ApiCalendarEvent['kind'];
type ApiScopeKind = ApiCalendarEvent['scopeKind'];
type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

const UI_TO_API_KIND: Record<SchoolYearEvent['type'], ApiKind> = {
	holiday: 'holiday',
	vacation: 'break',
	closure: 'other',
	ceremony: 'event',
};

function defaultBlocksTimetable(type: SchoolYearEvent['type']): boolean {
	return type !== 'ceremony';
}

function resolveIsNonSchoolDay(type: SchoolYearEvent['type'], blocksTimetable: boolean): boolean {
	if (type === 'ceremony') {
		return false;
	}
	return blocksTimetable;
}

function scopeFromUi(scope: SchoolYearEvent['scope']): { scopeKind: ApiScopeKind; scopeId?: string | null } {
	if (scope === 'all') {
		return { scopeKind: 'school', scopeId: null };
	}
	const classGroupId = scope[0];
	return { scopeKind: 'class_group', scopeId: classGroupId ?? null };
}

function createdAtIso(value: unknown): string {
	return typeof value === 'string' ? value : new Date().toISOString();
}

async function createClassGroupCalendarEvents(
	client: SchoolClient,
	input: {
		idPrefix: string;
		schoolId: string;
		academicYearId: string;
		classGroupIds: string[];
		title: string;
		description: string;
		startDate: string;
		endDate: string;
		type: SchoolYearEvent['type'];
		blocksTimetable: boolean;
		createdAt: string;
	},
): Promise<void> {
	for (const classGroupId of input.classGroupIds) {
		await client.commands.createCalendarEvent({
			id: `${input.idPrefix}-${classGroupId}`,
			schoolId: input.schoolId,
			academicYearId: input.academicYearId,
			title: input.title,
			description: input.description,
			startDate: input.startDate,
			endDate: input.endDate,
			kind: UI_TO_API_KIND[input.type],
			isNonSchoolDay: resolveIsNonSchoolDay(input.type, input.blocksTimetable),
			scopeKind: 'class_group',
			scopeId: classGroupId,
			createdAt: input.createdAt,
		});
	}
}

function calendarSavePayload(
	existing: ApiCalendarEvent,
	updates: {
		title: string;
		description: string;
		startDate: string;
		endDate: string;
		type: SchoolYearEvent['type'];
		scope: SchoolYearEvent['scope'];
		blocksTimetable: boolean;
	},
): ApiCalendarEvent {
	const { scopeKind, scopeId } = scopeFromUi(updates.scope);
	return {
		id: existing.id,
		schoolId: existing.schoolId,
		academicYearId: existing.academicYearId,
		title: updates.title,
		description: updates.description,
		startDate: updates.startDate,
		endDate: updates.endDate,
		kind: UI_TO_API_KIND[updates.type],
		isNonSchoolDay: resolveIsNonSchoolDay(updates.type, updates.blocksTimetable),
		scopeKind,
		scopeId: scopeKind === 'school' ? null : scopeId,
		createdAt: existing.createdAt,
	};
}

async function syncScopedCalendarEvents(
	client: SchoolClient,
	input: {
		eventId: string;
		linkedIds?: string[];
		title: string;
		description: string;
		startDate: string;
		endDate: string;
		type: SchoolYearEvent['type'];
		blocksTimetable: boolean;
		classGroupIds: string[];
	},
): Promise<ApiCalendarEvent> {
	const knownIds = input.linkedIds?.length ? [...input.linkedIds] : [input.eventId];
	const linkedEvents = await Promise.all(knownIds.map(id => client.entities.calendarEvents.get(id)));
	const primary = linkedEvents.find(entry => entry.id === input.eventId) ?? linkedEvents[0];
	const payloadBase = {
		title: input.title,
		description: input.description,
		startDate: input.startDate,
		endDate: input.endDate,
		type: input.type,
		blocksTimetable: input.blocksTimetable,
	};
	if (primary.scopeKind === 'school') {
		const [firstClassId, ...additionalClassIds] = input.classGroupIds;
		await client.entities.calendarEvents.save(calendarSavePayload(primary, {
			...payloadBase,
			scope: [firstClassId],
		}));
		if (additionalClassIds.length > 0) {
			await createClassGroupCalendarEvents(client, {
				idPrefix: `cal-${Date.now().toString(36)}`,
				schoolId: primary.schoolId,
				academicYearId: primary.academicYearId,
				classGroupIds: additionalClassIds,
				title: input.title,
				description: input.description,
				startDate: input.startDate,
				endDate: input.endDate,
				type: input.type,
				blocksTimetable: input.blocksTimetable,
				createdAt: createdAtIso(primary.createdAt),
			});
		}
		return primary;
	}
	const currentByClass = new Map<string, ApiCalendarEvent>();
	for (const event of linkedEvents) {
		if (event.scopeKind === 'class_group' && event.scopeId) {
			currentByClass.set(String(event.scopeId), event);
		}
	}
	for (const classGroupId of input.classGroupIds) {
		const existing = currentByClass.get(classGroupId);
		if (existing) {
			await client.entities.calendarEvents.save(calendarSavePayload(existing, {
				...payloadBase,
				scope: [classGroupId],
			}));
		}
	}
	const toCreate = input.classGroupIds.filter(classGroupId => !currentByClass.has(classGroupId));
	if (toCreate.length > 0) {
		const ref = primary;
		await createClassGroupCalendarEvents(client, {
			idPrefix: `cal-${Date.now().toString(36)}`,
			schoolId: ref.schoolId,
			academicYearId: ref.academicYearId,
			classGroupIds: toCreate,
			title: input.title,
			description: input.description,
			startDate: input.startDate,
			endDate: input.endDate,
			type: input.type,
			blocksTimetable: input.blocksTimetable,
			createdAt: createdAtIso(ref.createdAt),
		});
	}
	const toDelete = [...currentByClass.entries()]
		.filter(([classGroupId]) => !input.classGroupIds.includes(classGroupId))
		.map(([, event]) => event.id);
	if (toDelete.length > 0) {
		await client.entities.calendarEvents.batchDelete({ ids: toDelete });
	}
	return primary;
}

export async function createCalendarEventOnPage(
	state: CalendarPageState,
	input: {
		title: string;
		description: string;
		date: string;
		endDate?: string;
		type: SchoolYearEvent['type'];
		scope: SchoolYearEvent['scope'];
		blocksTimetable?: boolean;
		successMessage?: string;
	},
): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const schoolId = authSession.schoolId;
	const academicYearId = academicContext.yearId;
	if (!schoolId || !academicYearId) {
		toast.error(get(t)('calendar.noContext'));
		return null;
	}
	const endDate = input.endDate?.trim() || input.date;
	const description = input.description.trim() || input.title.trim();
	const blocksTimetable = resolveIsNonSchoolDay(
		input.type,
		input.blocksTimetable ?? defaultBlocksTimetable(input.type),
	);
	const baseId = `cal-${Date.now().toString(36)}`;
	const createdAt = new Date().toISOString();
	const optimisticId = input.scope === 'all' ? baseId : `${baseId}-${input.scope[0]}`;
	const optimistic: SchoolYearEvent = {
		id: optimisticId,
		title: input.title.trim(),
		date: input.date,
		endDate,
		type: input.type,
		description,
		scope: input.scope,
		blocksTimetable,
	};

	const result = await runCalendarRouteMutation({
		request: async () => {
			if (input.scope === 'all') {
				await client.commands.createCalendarEvent({
					id: baseId,
					schoolId,
					academicYearId,
					title: input.title.trim(),
					description,
					startDate: input.date,
					endDate,
					kind: UI_TO_API_KIND[input.type],
					isNonSchoolDay: blocksTimetable,
					scopeKind: 'school',
					createdAt,
				});
				return baseId;
			}
			await createClassGroupCalendarEvents(client, {
				idPrefix: baseId,
				schoolId,
				academicYearId,
				classGroupIds: input.scope,
				title: input.title.trim(),
				description,
				startDate: input.date,
				endDate,
				type: input.type,
				blocksTimetable,
				createdAt,
			});
			return `${baseId}-${input.scope[0]}`;
		},
		successMessage: input.successMessage,
		apply: () => {
			state.appendEvent(optimistic);
		},
		rollback: () => {
			state.removeEvent(optimisticId);
		},
	});

	return result ?? null;
}

export async function updateCalendarEventOnPage(
	state: CalendarPageState,
	input: {
		eventId: string;
		linkedIds?: string[];
		title: string;
		description: string;
		date: string;
		endDate?: string;
		type: SchoolYearEvent['type'];
		scope: SchoolYearEvent['scope'];
		blocksTimetable?: boolean;
		successMessage?: string;
	},
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const endDate = input.endDate?.trim() || input.date;
	const description = input.description.trim() || input.title.trim();
	const title = input.title.trim();
	const previous = state.findEvent(input.eventId);
	const blocksTimetable = resolveIsNonSchoolDay(
		input.type,
		input.blocksTimetable ?? previous?.blocksTimetable ?? defaultBlocksTimetable(input.type),
	);
	const patch = {
		title,
		description,
		date: input.date,
		endDate,
		type: input.type,
		scope: input.scope,
		blocksTimetable,
		linkedIds: input.linkedIds ?? previous?.linkedIds,
	};

	const result = await runCalendarRouteMutation({
		request: async () => {
			const knownIds = input.linkedIds?.length ? [...input.linkedIds] : [input.eventId];
			if (input.scope === 'all') {
				const existing = await client.entities.calendarEvents.get(input.eventId);
				const saved = await client.entities.calendarEvents.save(calendarSavePayload(existing, {
					title,
					description,
					startDate: input.date,
					endDate,
					type: input.type,
					scope: 'all',
					blocksTimetable,
				}));
				const toDelete = knownIds.filter(id => id !== input.eventId);
				if (toDelete.length > 0) {
					await client.entities.calendarEvents.batchDelete({ ids: toDelete });
				}
				return saved;
			}
			return syncScopedCalendarEvents(client, {
				eventId: input.eventId,
				linkedIds: input.linkedIds,
				title,
				description,
				startDate: input.date,
				endDate,
				type: input.type,
				blocksTimetable,
				classGroupIds: [...input.scope],
			});
		},
		successMessage: input.successMessage,
		apply: () => {
			state.patchEvent(input.eventId, patch);
		},
		rollback: () => {
			if (previous) {
				state.patchEvent(input.eventId, previous);
			}
		},
	});

	return result !== null;
}

export async function deleteCalendarEventOnPage(
	state: CalendarPageState,
	event: Pick<SchoolYearEvent, 'id' | 'linkedIds'>,
	opts?: { successMessage?: string },
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const ids = event.linkedIds?.length ? [...event.linkedIds] : [event.id];
	const previous = ids
		.map(id => state.findEvent(id))
		.filter((entry): entry is SchoolYearEvent => entry !== undefined);

	const result = await runCalendarRouteMutation({
		request: () => (ids.length === 1
			? client.entities.calendarEvents.delete({ id: ids[0] })
			: client.entities.calendarEvents.batchDelete({ ids })),
		successMessage: opts?.successMessage,
		apply: () => {
			for (const id of ids) {
				state.removeEvent(id);
			}
		},
		rollback: () => {
			for (const entry of previous) {
				state.appendEvent(entry);
			}
		},
	});

	return result !== null;
}

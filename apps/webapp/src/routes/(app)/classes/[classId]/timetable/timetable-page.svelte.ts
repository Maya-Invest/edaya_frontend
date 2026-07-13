import type { GenerateClassResult } from '$lib/api/mutations/timetable-generation.mutations';
import type { components } from '$lib/api/schema';
import type { TimetableMutationResult } from '$lib/components/school/scheduling/timetable-generation-errors';
import type { TimetablePlacementOverrides } from '$lib/components/school/scheduling/timetable-placement-parameters';
import type { EntityVersionKey } from '$lib/entity-versions.svelte';
import type { PlanningEvent } from '$lib/types/school';
import type { TimetablePageSlice } from './lib';
import { academicContext } from '$lib/academic/context.svelte';
import {
	generateClassTimetable,
	publishClassTimetable,
	republishClassTimetable,
} from '$lib/api/mutations/timetable-generation.mutations';
import { academicYearPlanningRange } from '$lib/api/planning-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { loadCalendarEvents } from '$lib/api/school-life-data';
import { teacherNameForClassSubject } from '$lib/api/teacher-display';
import {
	parseTimetableGenerationError,
} from '$lib/components/school/scheduling/timetable-generation-errors';
import {
	buildTimetablePlacementParameters,
} from '$lib/components/school/scheduling/timetable-placement-parameters';
import { formatDateInput } from '$lib/date/format';
import { entityVersions } from '$lib/entity-versions.svelte';
import { t } from '$lib/i18n';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { toast } from '$lib/toast.svelte';
import { getContext, setContext } from 'svelte';
import { get } from 'svelte/store';
import {
	emptyTimetableSlice,
	loadTimetableSlice,
	queryTimetableListPage,
	sessionDetailIdFromUrl,
	timetableClassIdFromUrl,

} from './lib';

function translateTimetable(key: string) {
	return get(t)(key);
}

export type TimetableGenerationOptions = components['schemas']['TimetableGenerationOptions'];
export type { GenerateClassResult, PublishResult, RepublishResult } from '$lib/api/mutations/timetable-generation.mutations';
export type { TimetableGenerationError, TimetableMutationResult } from '$lib/components/school/scheduling/timetable-generation-errors';
export type { TimetablePageSlice };

const TIMETABLE_VERSION_FAMILIES = ['planning', 'teacherUnavailabilities'] as const satisfies readonly EntityVersionKey[];
const KEY = Symbol('timetable-page-state');

export class TimetablePageState {
	slice = $state<TimetablePageSlice | null>(null);
	generationResult = $state<GenerateClassResult | null>(null);
	teacherUnavailabilities = $state<components['schemas']['TeacherUnavailability'][]>([]);
	classSubjects = $state<components['schemas']['ClassSubject'][]>([]);
	subjectLabels = $state<Record<string, string>>({});
	teacherLabelsByClassSubjectId = $state<Record<string, string>>({});
	teacherConstraintsLoading = $state(false);
	busy = $state(false);
	focusDate = $state('');
	activeRange = $state<{ startDate: string; endDate: string } | null>(null);
	private constraintsClassId = '';
	private readonly versions = new RouteVersionSnapshot(TIMETABLE_VERSION_FAMILIES);

	constructor(
		private readonly getUrl: () => URL,
		private readonly getClassId: () => string,
	) {}

	get classId() {
		return this.getClassId();
	}

	get selectedId() {
		return sessionDetailIdFromUrl(this.getUrl());
	}

	get selected() {
		return this.selectedSession(this.classId, this.selectedId);
	}

	private canLoad(): boolean {
		return Boolean(this.classId && academicContext.shellReady);
	}

	get academicYearRange() {
		return academicYearPlanningRange(academicContext.year);
	}

	get periodRange() {
		if (this.activeRange) {
			return this.activeRange;
		}
		const period = academicContext.period;
		const year = academicContext.year;
		return {
			startDate: formatDateInput(period?.startDate ?? year?.startDate),
			endDate: formatDateInput(period?.endDate ?? year?.endDate),
		};
	}

	get events() {
		return this.slice?.classId === this.classId ? this.slice.events : [];
	}

	get schedules() {
		return this.slice?.classId === this.classId ? this.slice.schedules : [];
	}

	get students() {
		return this.slice?.classId === this.classId ? this.slice.students : [];
	}

	get subjects() {
		return this.slice?.classId === this.classId ? this.slice.subjects : [];
	}

	get activities() {
		return this.slice?.classId === this.classId ? this.slice.activities : [];
	}

	get schoolYearEvents() {
		return this.slice?.classId === this.classId ? this.slice.schoolYearEvents : [];
	}

	applySlice(classId: string, data: Partial<Omit<TimetablePageSlice, 'classId'>>) {
		this.slice = { ...emptyTimetableSlice(classId), ...data, classId };
		this.versions.markLoaded();
	}

	seed(classId: string, data: Partial<Omit<TimetablePageSlice, 'classId'>>) {
		if (this.slice?.classId === classId) {
			return;
		}
		this.applySlice(classId, data);
	}

	selectedSession(classId: string, sessionId?: string) {
		if (!sessionId || this.slice?.classId !== classId) {
			return undefined;
		}
		return this.slice.events.find(event => event.id === sessionId);
	}

	patchEvent(id: string, patch: Partial<PlanningEvent>) {
		if (!this.slice) {
			return;
		}
		this.slice = {
			...this.slice,
			events: this.slice.events.map(event => event.id === id ? { ...event, ...patch } : event),
		};
	}

	queryListPage(classId: string) {
		return queryTimetableListPage(classId);
	}

	async invalidateIfStale() {
		if (!this.versions.hasLoaded() || !this.versions.isStale() || !this.canLoad()) {
			return;
		}
		try {
			await Promise.all([this.refresh({ silent: true }), this.loadTeacherConstraints({ silent: true })]);
		}
		catch {
			// PageQuery remains the source of truth on first paint; ignore background invalidation errors.
		}
	}

	async refresh(options?: { silent?: boolean }) {
		if (!this.canLoad()) {
			return;
		}
		try {
			const data = await loadTimetableSlice(this.classId);
			const yearId = academicContext.yearId;
			const schoolYearEvents = yearId
				? await loadCalendarEvents(getBrowserSchoolClient(), yearId)
				: data.schoolYearEvents;
			this.applySlice(this.classId, { ...data, schoolYearEvents });
		}
		catch (error) {
			if (!options?.silent) {
				throw error;
			}
		}
	}

	async loadTeacherConstraints(options?: { silent?: boolean; force?: boolean }) {
		if (!this.canLoad() || !academicContext.yearId) {
			return;
		}
		if (!options?.force && this.constraintsClassId === this.classId) {
			return;
		}
		this.teacherConstraintsLoading = true;
		try {
			const client = getBrowserSchoolClient();
			const classSubjects = await client.entities.classSubjects.list({ classGroupId: this.classId });
			this.classSubjects = classSubjects;
			const subjectIds = classSubjects.map(row => row.subjectId);
			const subjects = subjectIds.length
				? await client.entities.subjects.list({ id: { $in: subjectIds } })
				: [];
			this.subjectLabels = Object.fromEntries(subjects.map(subject => [subject.id, subject.name]));
			const assignments = classSubjects.length
				? await client.entities.teacherAssignments.list({
						classSubjectId: { $in: classSubjects.map(row => row.id) },
						academicYearId: academicContext.yearId,
						status: 'active',
					})
				: [];
			const teacherIds = assignments
				.map(row => row.teacherId)
				.filter((teacherId, index, values) => values.indexOf(teacherId) === index);
			const teachers = teacherIds.length
				? await client.entities.teachers.list({ id: { $in: teacherIds } })
				: [];
			const instructorSources = {
				teachersRaw: teachers,
				teacherAssignmentsRaw: assignments,
				staffMembersRaw: [],
				staffAssignmentsRaw: [],
			};
			this.teacherLabelsByClassSubjectId = Object.fromEntries(
				classSubjects.map(subject => [
					subject.id,
					teacherNameForClassSubject(subject.id, instructorSources, ''),
				]),
			);
			this.teacherUnavailabilities = teacherIds.length
				? await client.entities.teacherUnavailabilities.list({
						teacherId: { $in: teacherIds },
						academicYearId: academicContext.yearId,
						isActive: true,
					})
				: [];
			this.constraintsClassId = this.classId;
		}
		catch (error) {
			if (!options?.silent) {
				throw error;
			}
		}
		finally {
			this.teacherConstraintsLoading = false;
		}
	}

	generatedCounts(startDate: string, endDate: string) {
		const inRange = this.events.filter((event) => {
			const date = event.startsAt.slice(0, 10);
			return date >= startDate && date <= endDate;
		});
		return {
			draft: inRange.filter(event => event.timetableGenerated === 'draft').length,
			published: inRange.filter(event => event.timetableGenerated === 'published').length,
		};
	}

	private async runMutation<T>(
		request: () => Promise<T>,
		options?: { reportInModal?: boolean },
	): Promise<TimetableMutationResult<T>> {
		this.busy = true;
		try {
			const result = await request();
			entityVersions.bump('planning');
			await this.refresh();
			return { ok: true, value: result };
		}
		catch (error) {
			const parsed = parseTimetableGenerationError(error, translateTimetable);
			if (!options?.reportInModal) {
				toast.error(parsed.summary);
			}
			return { ok: false, error: parsed };
		}
		finally {
			this.busy = false;
		}
	}

	private async run<T>(request: () => Promise<T>): Promise<T | null> {
		const outcome = await this.runMutation(request);
		return outcome.ok ? outcome.value : null;
	}

	async generate(input: {
		startDate: string;
		endDate: string;
		options?: TimetableGenerationOptions;
	} & TimetablePlacementOverrides): Promise<TimetableMutationResult<GenerateClassResult>> {
		const outcome = await this.runMutation(() => generateClassTimetable({
			classGroupId: this.classId,
			academicYearId: academicContext.yearId,
			startDate: input.startDate,
			endDate: input.endDate,
			options: input.options,
			placementParameters: buildTimetablePlacementParameters(input),
		}), { reportInModal: true });
		if (outcome.ok) {
			this.generationResult = outcome.value;
			this.activeRange = { startDate: input.startDate, endDate: input.endDate };
			this.focusDate = outcome.value.placements[0]?.cell.date ?? input.startDate;
		}
		return outcome;
	}

	async publish(startDate: string, endDate: string, policy: 'fail' | 'skip') {
		return this.run(() => publishClassTimetable({
			classGroupId: this.classId,
			startDate,
			endDate,
			sessionConflictPolicy: policy,
		}));
	}

	async republish(input: {
		startDate: string;
		endDate: string;
		policy: 'fail' | 'skip';
		options?: TimetableGenerationOptions;
	} & TimetablePlacementOverrides) {
		const outcome = await this.runMutation(() => republishClassTimetable({
			classGroupId: this.classId,
			academicYearId: academicContext.yearId,
			startDate: input.startDate,
			endDate: input.endDate,
			options: input.options,
			placementParameters: buildTimetablePlacementParameters(input),
			sessionConflictPolicy: input.policy,
		}), { reportInModal: true });
		if (outcome.ok) {
			this.generationResult = outcome.value.generation;
			this.activeRange = { startDate: input.startDate, endDate: input.endDate };
			this.focusDate = outcome.value.generation.placements[0]?.cell.date ?? input.startDate;
		}
		return outcome;
	}
}

export function setTimetablePageState(state: TimetablePageState) {
	setContext(KEY, state);
}

export function getTimetablePageState() {
	return getContext<TimetablePageState>(KEY);
}

export { timetableClassIdFromUrl };

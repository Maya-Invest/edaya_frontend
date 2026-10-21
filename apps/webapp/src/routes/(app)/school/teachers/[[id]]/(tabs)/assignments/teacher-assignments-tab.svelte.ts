import type { components } from '$lib/api/schema';
import type { PageQueryRequest } from '../../../lib/teacher-page-status';
import type { TeachersPageState } from '../../../teachers-page.svelte';
import { entitiesByIds, teacherAssignmentsForTeachers } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { VersionedRouteQuery } from '$lib/navigation/versioned-route-query';
import { getContext, setContext } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { resolveTeacherPageLoad } from '../../../lib/teacher-page-status';
import { teacherDetailIdFromUrl } from '../../../lib/teacher-selectors';

type TeacherAssignment = components['schemas']['TeacherAssignment'];
const TEACHER_ASSIGNMENTS_TAB_KEY = Symbol('teacher-assignments-tab');
export interface TeacherAssignmentsTabSlice {
    teacherId: string;
    assignments: TeacherAssignment[];
}
export class TeacherAssignmentsTabState {
    private readonly versionedQuery = new VersionedRouteQuery(new RouteVersionSnapshot(['teachers', 'subjects', 'staff']));
    invalidateIfStale = () => this.versionedQuery.invalidateIfStale();
    async loadClassSubjectChoices(schoolId: string, classGroupId: string) {
        const client = getBrowserSchoolClient();
        const classSubjects = await client.entities.classSubjects.list({ schoolId, classGroupId });
        const ids = [...new SvelteSet(classSubjects.map(entry => entry.subjectId))];
        const subjects = ids.length ? await client.entities.subjects.list(entitiesByIds(ids)) : [];
        return { classSubjects, subjects };
    }

    slice = $state<TeacherAssignmentsTabSlice | null>(null);
    constructor(private readonly getPage: () => TeachersPageState) {
    }

    clear() {
        this.versionedQuery.clear();
        this.slice = null;
    }

    assignmentsFor(teacherId: string): TeacherAssignment[] {
        return this.slice?.teacherId === teacherId ? this.slice.assignments : [];
    }

    removeAssignment(id: string) {
        if (!this.slice) {
            return;
        }
        this.slice = {
            ...this.slice,
            assignments: this.slice.assignments.filter(row => row.id !== id),
        };
    }

    upsertAssignment(row: TeacherAssignment) {
        if (!this.slice || this.slice.teacherId !== row.teacherId) {
            return;
        }
        const index = this.slice.assignments.findIndex(entry => entry.id === row.id);
        if (index >= 0) {
            const next = [...this.slice.assignments];
            next[index] = row;
            this.slice = { ...this.slice, assignments: next };
            return;
        }
        this.slice = {
            ...this.slice,
            assignments: [...this.slice.assignments, row],
        };
    }

    query() {
        return this.versionedQuery.track((url: URL, request?: PageQueryRequest) => resolveTeacherPageLoad(url, {
            empty: () => ({}),
            load: async (signal) => {
                const teacherId = teacherDetailIdFromUrl(url);
                if (!teacherId) {
                    return {};
                }
                const page = this.getPage();
                await page.loadSubjectsIfNeeded();
                const scope = page.teacherScope();
                const assignments = await getBrowserSchoolClient().entities.teacherAssignments.list({
                    ...teacherAssignmentsForTeachers([teacherId]),
                    academicYearId: scope.academicYearId,
                });
                signal.throwIfAborted();
                this.slice = {
                    teacherId,
                    assignments: assignments ?? [],
                };
                page.setAssignmentCount(teacherId, (assignments ?? []).length);
                return {};
            },
            hasItems: () => true,
            errorMessage: 'Unable to load teacher assignments.',
        }, request));
    }
}
export function setTeacherAssignmentsTabState(state: TeacherAssignmentsTabState) {
    setContext(TEACHER_ASSIGNMENTS_TAB_KEY, state);
}
export function getTeacherAssignmentsTabState() {
    return getContext<TeacherAssignmentsTabState>(TEACHER_ASSIGNMENTS_TAB_KEY);
}

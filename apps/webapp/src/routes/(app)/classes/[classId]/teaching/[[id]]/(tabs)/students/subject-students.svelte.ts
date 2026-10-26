import type { components } from '$lib/api/schema';
import type { PageQueryRequest } from '$lib/queries/page-status';
import { listAllEntityPages } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { VersionedRouteQuery } from '$lib/navigation/versioned-route-query';
import { resolvePageLoad } from '$lib/queries/page-status';
import { SvelteDate, SvelteSet } from 'svelte/reactivity';

export class SubjectStudentsState {
  private readonly versioned = new VersionedRouteQuery(new RouteVersionSnapshot(['subjectEnrollments', 'enrollments', 'subjects']));
  invalidateIfStale = () => this.versioned.invalidateIfStale();
  roster = $state<components['schemas']['ClassSubjectRosterResponse'] | null>(null);
  optional = $state(false);
  intervals = $state<components['schemas']['StudentSubjectEnrollment'][]>([]);
  placements = $state<components['schemas']['StudentClassEnrollment'][]>([]);
  students = $state<components['schemas']['Student'][]>([]);
  query(classSubjectId: string) {
    return this.versioned.track((url: URL, request?: PageQueryRequest) => resolvePageLoad(url, {
      empty: () => ({}),
      load: async (signal) => {
        const client = getBrowserSchoolClient();
        const at = url.searchParams.get('rosterAt') ?? new SvelteDate().toISOString();
        const offering = await client.entities.classSubjects.get(classSubjectId);
        const [roster, placements, subject, intervals] = await Promise.all([
          client.queries.getClassSubjectRoster({ classSubjectId, at }),
          listAllEntityPages(query => client.entities.enrollments.list(query), { baseQuery: { classGroupId: offering.classGroupId } }),
          client.entities.subjects.get(offering.subjectId),
          listAllEntityPages(query => client.entities.subjectEnrollments.list(query), { baseQuery: { classSubjectId } }),
        ]);
        const students = await listAllEntityPages(query => client.entities.students.list(query), { baseQuery: { id: { $in: [...new SvelteSet(placements.map(row => row.studentId))] } } });
        signal.throwIfAborted();
        this.roster = roster;
        this.placements = placements;
        this.intervals = intervals;
        this.students = students;
        this.optional = Boolean(subject.isOptional && offering.isOffered);
        return {};
      },
      hasItems: () => true,
    }, request));
  }
}

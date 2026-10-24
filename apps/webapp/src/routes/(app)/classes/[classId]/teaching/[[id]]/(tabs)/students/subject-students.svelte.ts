import type { components } from '$lib/api/schema';
import type { PageQueryRequest } from '$lib/queries/page-status';
import { listAllEntityPages } from '$lib/api/entity-list-filters';
import { runRouteMutation } from '$lib/api/mutations/route-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { VersionedRouteQuery } from '$lib/navigation/versioned-route-query';
import { resolvePageLoad } from '$lib/queries/page-status';
import { EnrollmentRequest, isParticipationConflict } from '$lib/subjects/enrollment-request';
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

  private readonly participationRequest = new EnrollmentRequest();
  private expectedRevision = 0;
  captureRevision() { this.expectedRevision = this.roster?.revision ?? 0; }
  async save(operations: components['schemas']['ManageStudentSubjectEnrollmentsCommand']['operations']) {
    if (!this.roster || !operations.length)
      return false;
    const result = await runRouteMutation({ request: async () => {
      const client = getBrowserSchoolClient();
      try {
          return await client.commands.manageStudentSubjectEnrollments(this.participationRequest.prepare({ requestId: crypto.randomUUID(), expectedRevisions: { [this.roster!.classSubjectId]: this.expectedRevision }, operations }));
      }
      catch (error) {
        if (isParticipationConflict(error) && this.roster) {
          const [roster, intervals] = await Promise.all([
            client.queries.getClassSubjectRoster({ classSubjectId: this.roster.classSubjectId, at: String(this.roster.at) }),
            listAllEntityPages(query => client.entities.subjectEnrollments.list(query), { baseQuery: { classSubjectId: this.roster.classSubjectId } }),
          ]);
          this.roster = roster;
          this.intervals = intervals;
          this.captureRevision();
        }
        throw error;
      }
    }, versionKeys: ['subjectEnrollments', 'enrollments', 'attendance', 'evaluations', 'reportCards', 'planning', 'subjects'] });
    if (!result)
      return false;
    this.participationRequest.complete();
    await this.invalidateIfStale();
    return true;
  }
}

import type { components } from '$lib/api/schema';
import type { PageQueryRequest } from '$lib/queries/page-status';
import { academicContext } from '$lib/academic/context.svelte';
import { listAllEntityPages } from '$lib/api/entity-list-filters';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';

type StudentProfile = components['schemas']['StudentAcademicYearProfile'];
type TeacherProfile = components['schemas']['TeacherAcademicYearProfile'];
export class AnnualProfileState {
    student = $state<StudentProfile | null>(null);
    teacher = $state<TeacherProfile | null>(null);
    options = $state<{
        id: string;
        label: string;
        shortName?: string;
        isActive: boolean;
    }[]>([]);

    busy = $state(false);
    loadedIdentity = $state('');
    constructor(readonly kind: 'student' | 'teacher', private readonly personId: () => string) {
    }

    identity() {
        return `${authSession.subjectId}:${authSession.schoolId}:${academicContext.yearId}:${this.kind}:${this.personId()}`;
    }

    async load(signal?: AbortSignal) {
        const identity = this.identity();
        const schoolId = authSession.schoolId;
        const academicYearId = academicContext.yearId;
        const personId = this.personId();
        if (!schoolId || !academicYearId) {
            this.student = null;
            this.teacher = null;
            this.options = [];
            return {};
        }
        this.student = null;
        this.teacher = null;
        this.options = [];
        this.loadedIdentity = '';
        const client = getBrowserSchoolClient();
        if (this.kind === 'student') {
            const [profiles, options] = await Promise.all([client.entities.studentAcademicYearProfiles.list({ schoolId, academicYearId, studentId: personId }), listAllEntityPages(query => client.entities.placementStatuses.list(query), { baseQuery: { schoolId } })]);
            signal?.throwIfAborted();
            if (identity !== this.identity())
                return {};
            this.student = profiles[0] ?? null;
            this.teacher = null;
            this.options = options.map(option => ({ ...option, label: option.name }));
        }
        else {
            const [profiles, options] = await Promise.all([client.entities.teacherAcademicYearProfiles.list({ schoolId, academicYearId, teacherId: personId }), listAllEntityPages(query => client.entities.academicDisciplines.list(query), { baseQuery: { schoolId } })]);
            signal?.throwIfAborted();
            if (identity !== this.identity())
                return {};
            this.teacher = profiles[0] ?? null;
            this.student = null;
            this.options = options.map(option => ({ ...option, label: option.name }));
        }
        this.loadedIdentity = identity;
        return {};
    }

    query = (url: URL, request?: PageQueryRequest) => resolvePageLoad(url, { empty: () => ({}), hasItems: listPageHasItems, load: signal => this.load(signal) }, request);
    async save(input: {
        personId: string;
        academicYearId: string;
        placementStatusId: string | null;
        isRepeating: boolean | null;
        disciplineIds: string[];
        declaredHours: number | null;
        hoursPeriod: TeacherProfile['hoursPeriod'];
        hoursPeriodLabel: string | null;
    }) {
        if (input.personId !== this.personId() || input.academicYearId !== academicContext.yearId)
            return false;
        const identity = this.identity();
        this.busy = true;
        try {
            const client = getBrowserSchoolClient();
            const value = await runMutation<unknown>(() => this.kind === 'student'
                ? client.commands.upsertStudentAcademicYearProfile({ studentId: input.personId, academicYearId: input.academicYearId, placementStatusId: input.placementStatusId, isRepeating: input.isRepeating })
                : client.commands.upsertTeacherAcademicYearProfile({ teacherId: input.personId, academicYearId: input.academicYearId, disciplineIds: input.disciplineIds, declaredHours: input.declaredHours, hoursPeriod: input.hoursPeriod, hoursPeriodLabel: input.hoursPeriodLabel }), { versionKeys: ['students', 'teachers'] });
            if (!value || identity !== this.identity())
                return false;
            await this.load();
            return true;
        }
        finally {
            this.busy = false;
        }
    }

    async remove() {
        const id = this.student?.id ?? this.teacher?.id;
        if (!id || this.loadedIdentity !== this.identity())
            return false;
        this.busy = true;
        try {
            const client = getBrowserSchoolClient();
            const identity = this.identity();
            const value = await runMutation<unknown>(() => this.kind === 'student' ? client.commands.removeStudentAcademicYearProfile({ id }) : client.commands.removeTeacherAcademicYearProfile({ id }), { versionKeys: ['students', 'teachers'] });
            if (!value || identity !== this.identity())
                return false;
            await this.load();
            return true;
        }
        finally {
            this.busy = false;
        }
    }
}

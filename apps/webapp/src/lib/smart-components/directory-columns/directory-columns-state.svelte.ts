import type { ListEntityTableColumn } from '$lib/list/list-entity-table-types';
import type { PersonKind } from '$lib/people-profile-fields';
import type { PageQueryRequest } from '$lib/queries/page-status';
import { academicContext } from '$lib/academic/context.svelte';
import { listAllEntityPages, listAllEntityPagesByIds, listAllEntityPagesForIdFilters } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { authSession } from '$lib/auth/session.svelte';
import { formatDateInput } from '$lib/date/format';
import { entityVersions } from '$lib/entity-versions.svelte';
import { t } from '$lib/i18n';
import { downloadCsv } from '$lib/list/list-csv-export';
import { resolveTableColumnKeys } from '$lib/list/table-column-preferences';
import { PERSON_PROFILE_FIELDS } from '$lib/people-profile-fields';
import { hasAnyPermission, hasPermission } from '$lib/permissions';
import { listPageHasItems, resolvePageLoad } from '$lib/queries/page-status';
import { SvelteSet } from 'svelte/reactivity';
import { get } from 'svelte/store';

interface DirectoryRow {
    id: string;
    classId?: string;
}
type Values = Record<string, Record<string, unknown>>;
const HEALTH_FIELDS = ['bloodType', 'allergies', 'medicalConditions', 'medications', 'clinicalNotes', 'emergencyProtocols', 'lastVisit'] as const;
const RESTRICTED = Symbol('restricted');
export class DirectoryColumnsState {
    keys = $state<string[]>([]);
    values = $state<Values>({});
    loadedScope = $state('');
    scope() {
        return `${authSession.subjectId}:${authSession.schoolId}:${academicContext.yearId}:${JSON.stringify(authSession.grants)}`;
    }

    constructor(readonly kind: PersonKind) {
    }

    columns(_rows: readonly DirectoryRow[]): ListEntityTableColumn[] {
        const fields = [
            { key: 'firstName', labelKey: 'common.firstName' },
            { key: 'lastName', labelKey: 'common.lastName' },
            ...PERSON_PROFILE_FIELDS[this.kind],
            { key: 'email', labelKey: 'common.email' },
            { key: 'accountState', labelKey: 'profile.accountState' },
        ];
        if (this.kind === 'student')
            fields.push({ key: 'academicYear', labelKey: 'profile.academicYear' }, { key: 'birthdate', labelKey: 'drawer.birthDate' }, { key: 'placementStatusLabel', labelKey: 'profile.placementStatuses' }, { key: 'isRepeating', labelKey: 'profile.repeating' }, { key: 'guardian', labelKey: 'student.guardians' }, { key: 'guardianContacts', labelKey: 'profile.contactMethods' });
        if (this.kind === 'teacher')
            fields.push({ key: 'code', labelKey: 'common.code' }, { key: 'phone', labelKey: 'common.phone' }, { key: 'declaredDisciplines', labelKey: 'profile.academicDisciplines' }, { key: 'declaredHours', labelKey: 'profile.declaredHours' }, { key: 'hoursPeriod', labelKey: 'profile.hoursPeriod' }, { key: 'assignmentSummary', labelKey: 'profile.assignments' }, { key: 'availabilitySummary', labelKey: 'profile.availability' });
        if (this.kind === 'staff')
            fields.push({ key: 'isActive', labelKey: 'common.status' }, { key: 'responsibilitySummary', labelKey: 'profile.responsibilities' }, { key: 'permissionValiditySummary', labelKey: 'profile.permissionValidity' });
        if (this.kind === 'guardian')
            fields.push({ key: 'alternativePhone', labelKey: 'guardian.contacts.alternativePhone' }, { key: 'emailNotificationsEnabled', labelKey: 'account.notifications.email' }, { key: 'smsNotificationsEnabled', labelKey: 'account.notifications.sms' }, { key: 'pushNotificationsEnabled', labelKey: 'account.notifications.push' }, { key: 'hasAccess', labelKey: 'profile.portalAccess' }, { key: 'relationshipSummary', labelKey: 'profile.relationships' });
        const seen = new SvelteSet<string>();
        const columns: ListEntityTableColumn[] = fields.filter(field => !seen.has(field.key) && Boolean(seen.add(field.key))).map(field => ({ key: field.key, label: get(t)(field.labelKey), span: 2, minWidth: 160, defaultVisible: false, group: get(t)(['academicYear', 'placementStatusLabel', 'isRepeating', 'declaredDisciplines', 'declaredHours', 'hoursPeriod', 'assignmentSummary', 'availabilitySummary', 'responsibilitySummary', 'permissionValiditySummary'].includes(field.key) ? 'profile.yearInformation' : ['email', 'phone', 'guardian', 'guardianContacts', 'alternativePhone', 'emailNotificationsEnabled', 'smsNotificationsEnabled', 'pushNotificationsEnabled', 'relationshipSummary'].includes(field.key) ? 'profile.contactsRelationships' : ['accountState', 'hasAccess', 'isActive'].includes(field.key) ? 'profile.accountAccess' : 'profile.identityFields') }));
        if (this.kind === 'student' && hasPermission('STUDENT_HEALTH_READ')) {
            columns.push(...HEALTH_FIELDS.map(field => ({ key: `health.${field}`, label: get(t)(`profile.health.${field}`), span: 2, minWidth: 180, defaultVisible: false, group: get(t)('student.health') })));
        }
        return columns.filter(column => !['guardian', 'guardianContacts'].includes(column.key) || hasPermission('PARENT_READ')).filter(column => !['placementStatusLabel', 'isRepeating'].includes(column.key) || hasPermission('STUDENT_READ')).filter(column => column.key !== 'permissionValiditySummary' || hasAnyPermission(['ACCESS_CONTROL_READ'])).filter(column => column.key !== 'availabilitySummary' || hasAnyPermission(['STAFF_READ', 'ACCESS_CONTROL_READ']));
    }

    identity(rows: readonly DirectoryRow[]) {
        return `${this.scope()}:${entityVersions.students}:${entityVersions.guardians}:${entityVersions.teachers}:${entityVersions.staff}:${entityVersions.subjects}:${entityVersions.teacherUnavailabilities}:${entityVersions.enrollments}:${this.kind}:${rows.map(row => `${row.id}:${row.classId ?? ''}`).join(',')}:${this.keys.join(',')}`;
    }

    async load(rows: readonly DirectoryRow[], signal?: AbortSignal) {
        const identity = this.identity(rows);
        const schoolId = authSession.schoolId;
        const academicYearId = academicContext.yearId;
        const ids = rows.map(row => row.id);
        const client = getBrowserSchoolClient();
        const values: Values = Object.fromEntries(ids.map(id => [id, {}]));
        if (!schoolId || !ids.length) {
            this.values = values;
            this.loadedScope = this.scope();
            return values;
        }
        const has = (...keys: string[]) => keys.some(key => this.keys.includes(key));
        const requests: Promise<void>[] = [];
        if (this.kind === 'student' && academicYearId && has('placementStatusLabel', 'isRepeating')) {
            requests.push((async () => {
                const allowedIds = rows.filter(row => hasPermission('STUDENT_READ', { classId: row.classId, studentId: row.id })).map(row => row.id);
                for (const row of rows) {
                    if (!allowedIds.includes(row.id))
                        Object.assign(values[row.id]!, { placementStatusLabel: RESTRICTED, isRepeating: RESTRICTED });
                }
                if (!allowedIds.length)
                    return;
                const [profiles, statuses] = await Promise.all([listAllEntityPagesForIdFilters(query => client.entities.studentAcademicYearProfiles.list(query), [{ field: 'studentId', ids: allowedIds }], { extraQuery: { schoolId, academicYearId } }), listAllEntityPages(query => client.entities.placementStatuses.list(query), { baseQuery: { schoolId } })]);
                for (const profile of profiles)
                    Object.assign(values[profile.studentId] ??= {}, { placementStatusLabel: statuses.find(status => status.id === profile.placementStatusId)?.name, isRepeating: profile.isRepeating });
            })());
        }
        if (this.kind === 'student' && has('guardianContacts')) {
            requests.push((async () => {
                const allowedIds = rows.filter(row => hasPermission('PARENT_READ', { classId: row.classId, studentId: row.id })).map(row => row.id);
                for (const row of rows) {
                    if (!allowedIds.includes(row.id))
                        values[row.id]!.guardianContacts = RESTRICTED;
                }
                if (!allowedIds.length)
                    return;
                const links = await listAllEntityPagesForIdFilters(query => client.entities.guardianLinks.list(query), [{ field: 'studentId', ids: allowedIds }]);
                const guardians = await listAllEntityPagesByIds(query => client.entities.guardians.list(query), [...new SvelteSet(links.map(link => link.guardianId))]);
                for (const id of allowedIds) {
                    values[id]!.guardianContacts = links.filter(link => link.studentId === id).map((link) => {
                        const guardian = guardians.find(row => row.id === link.guardianId);
                        return guardian ? `${guardian.firstName} ${guardian.lastName}: ${[guardian.phone, guardian.alternativePhone, guardian.email].filter(Boolean).join(', ')}` : get(t)('profile.restricted');
                    }).filter(Boolean);
                }
            })());
        }
        if (this.kind === 'student' && this.keys.some(key => key.startsWith('health.'))) {
            requests.push((async () => {
                const allowed = rows.filter(row => hasPermission('STUDENT_HEALTH_READ', { classId: row.classId, studentId: row.id })).map(row => row.id);
                for (const row of rows) {
                    if (!allowed.includes(row.id)) {
                        for (const field of HEALTH_FIELDS)
                            values[row.id]![`health.${field}`] = RESTRICTED;
                    }
                }
                if (!allowed.length)
                    return;
                const profiles = await listAllEntityPagesForIdFilters(query => client.entities.studentHealthProfiles.list(query), [{ field: 'studentId', ids: allowed }]);
                for (const profile of profiles) {
                    for (const field of HEALTH_FIELDS)
                        values[profile.studentId]![`health.${field}`] = profile[field];
                }
            })());
        }
        if (this.kind === 'teacher' && academicYearId && has('declaredDisciplines', 'declaredHours', 'hoursPeriod')) {
            requests.push((async () => {
                const [profiles, disciplines] = await Promise.all([listAllEntityPagesForIdFilters(query => client.entities.teacherAcademicYearProfiles.list(query), [{ field: 'teacherId', ids }], { extraQuery: { schoolId, academicYearId } }), listAllEntityPages(query => client.entities.academicDisciplines.list(query), { baseQuery: { schoolId } })]);
                for (const profile of profiles)
                    Object.assign(values[profile.teacherId] ??= {}, { declaredDisciplines: profile.disciplineIds.map(id => disciplines.find(discipline => discipline.id === id)?.name ?? id), declaredHours: profile.declaredHours, hoursPeriod: `${get(t)(`profile.period.${profile.hoursPeriod}`)} ${profile.hoursPeriodLabel ?? ''}`.trim() });
            })());
        }
        if (this.kind === 'teacher' && academicYearId && has('assignmentSummary')) {
            requests.push((async () => {
                const entries = await listAllEntityPagesForIdFilters(query => client.entities.teacherAssignments.list(query), [{ field: 'teacherId', ids }], { extraQuery: { academicYearId } });
                for (const id of ids)
                    values[id]!.assignmentSummary = entries.filter(entry => entry.teacherId === id).map(entry => `${get(t)(`teacher.assignmentKind.${entry.kind}`)} · ${academicContext.classes.find(row => row.id === entry.classGroupId)?.name ?? get(t)('profile.restricted')} · ${entry.responsibility ?? ''} · ${get(t)(entry.status === 'ended' ? 'profile.assignmentEnded' : 'teacher.statusActive')} · ${entry.startsAt ?? '—'} – ${entry.endsAt ?? '—'}`);
            })());
        }
        if (this.kind === 'teacher' && academicYearId && has('availabilitySummary') && hasAnyPermission(['STAFF_READ', 'ACCESS_CONTROL_READ'])) {
            requests.push((async () => {
                const entries = await listAllEntityPagesForIdFilters(query => client.entities.teacherUnavailabilities.list(query), [{ field: 'teacherId', ids }], { extraQuery: { academicYearId } });
                for (const id of ids)
                    values[id]!.availabilitySummary = entries.filter(entry => entry.teacherId === id).map(entry => `${entry.dayOfWeek ?? ''} ${entry.startTime ?? entry.startsAt ?? ''} – ${entry.endTime ?? entry.endsAt ?? ''} ${entry.reason ?? ''}`.trim());
            })());
        }
        if (this.kind === 'staff' && academicYearId && has('permissionValiditySummary') && hasAnyPermission(['ACCESS_CONTROL_READ'])) {
            requests.push((async () => {
                const entries = await listAllEntityPagesForIdFilters(query => client.entities.staffManualPermissionAssignments.list(query), [{ field: 'staffId', ids }], { extraQuery: { academicYearId } });
                for (const id of ids)
                    values[id]!.permissionValiditySummary = entries.filter(entry => entry.staffId === id).map(entry => `${get(t)(`permission.${entry.permission}`)} · ${get(t)(`profile.assignmentStatus.${entry.status}`)} · ${entry.startsAt ?? '—'} – ${entry.endsAt ?? '—'}`);
            })());
        }
        if (this.kind === 'staff' && academicYearId && has('responsibilitySummary')) {
            requests.push((async () => {
                const entries = await listAllEntityPagesForIdFilters(query => client.entities.staffAssignments.list(query), [{ field: 'staffId', ids }], { extraQuery: { academicYearId } });
                for (const id of ids)
                    values[id]!.responsibilitySummary = entries.filter(entry => entry.staffId === id).map(entry => entry.responsibility);
            })());
        }
        await Promise.all(requests);
        signal?.throwIfAborted();
        if (identity === this.identity(rows)) {
            this.values = values;
            this.loadedScope = this.scope();
        }
        return values;
    }

    query = (rows: readonly DirectoryRow[], url: URL, request?: PageQueryRequest) => resolvePageLoad(url, { empty: () => ({}), hasItems: listPageHasItems, load: async (signal) => {
            await this.load(rows, signal);
            return {};
        } }, request);

    value(row: DirectoryRow, key: string, extra: Values = this.loadedScope === this.scope() ? this.values : {}): string {
        const data = Object.fromEntries(Object.entries(row));
        let value: unknown = extra[row.id]?.[key] ?? data[key];
        if (['birthdate', 'enrollmentDate', 'health.lastVisit'].includes(key))
            value = formatDateInput(value);
        if (key === 'academicYear')
            value = academicContext.year?.label;
        if (key === 'accountState')
            value = data.subjectId ? get(t)('profile.accountLinked') : get(t)('profile.notLinked');
        if (this.kind === 'student' && ['guardian', 'guardianContacts'].includes(key) && !hasPermission('PARENT_READ', { classId: row.classId, studentId: row.id }))
            return get(t)('profile.restricted');
        if (this.kind === 'student' && ['placementStatusLabel', 'isRepeating'].includes(key) && !hasPermission('STUDENT_READ', { classId: row.classId, studentId: row.id }))
            return get(t)('profile.restricted');
        if (key.startsWith('health.') && !hasPermission('STUDENT_HEALTH_READ', { classId: row.classId, studentId: row.id }))
            return get(t)('profile.restricted');
        if (key === 'relation') {
            value = (data.links as {
                studentId: string;
                relationship: string;
            }[] | undefined)?.map(link => `${(data.studentNames as Record<string, string> | undefined)?.[link.studentId] ?? get(t)('profile.restricted')}: ${link.relationship}`);
        }
        if (key === 'relationshipSummary') {
            value = (data.links as {
                studentId: string;
                relationship: string;
                isPrimary: boolean;
                legalGuardian: boolean;
                canPickup: boolean;
                isBillingContact: boolean;
                emergencyContactPriority?: number;
                receivesAcademicReports: boolean;
                receivesAttendanceAlerts: boolean;
                contactRestrictions?: string;
                notes?: string;
            }[] | undefined)?.map(link => `${(data.studentNames as Record<string, string> | undefined)?.[link.studentId] ?? get(t)('profile.restricted')}: ${link.relationship} · ${get(t)('profile.isPrimary')}: ${this.format(link.isPrimary)} · ${get(t)('profile.legalGuardian')}: ${this.format(link.legalGuardian)} · ${get(t)('profile.canPickup')}: ${this.format(link.canPickup)} · ${get(t)('profile.isBillingContact')}: ${this.format(link.isBillingContact)} · ${get(t)('profile.emergencyPriority')}: ${link.emergencyContactPriority ?? '—'} · ${get(t)('profile.receivesAcademicReports')}: ${this.format(link.receivesAcademicReports)} · ${get(t)('profile.receivesAttendanceAlerts')}: ${this.format(link.receivesAttendanceAlerts)} ${link.contactRestrictions ?? ''} ${link.notes ?? ''}`);
        }
        return this.format(value);
    }

    async exportCsv<T extends DirectoryRow>(filename: string, rows: readonly T[], columns: readonly ListEntityTableColumn[], value?: (row: T, key: string) => string | number | undefined) {
        const scope = this.scope();
        const selected = columns.filter(column => column.key !== 'actions' && resolveTableColumnKeys(columns, this.keys.length ? this.keys : null).includes(column.key));
        const extra = await this.load(rows);
        if (scope !== this.scope())
            return;
        downloadCsv(filename, [selected.map(column => column.label), ...rows.map(row => selected.map(column => value?.(row, column.key) ?? this.value(row, column.key, extra)))]);
    }

    format(value: unknown): string {
        if (value === RESTRICTED)
            return get(t)('profile.restricted');
        if (value == null || value === '' || (Array.isArray(value) && !value.length))
            return get(t)('profile.notProvided');
        if (typeof value === 'boolean')
            return get(t)(value ? 'common.yes' : 'common.no');
        if (Array.isArray(value))
            return value.map(entry => this.format(entry)).join('; ');
        return typeof value === 'object' ? get(t)('profile.notProvided') : String(value);
    }
}

import type { PageLoadMeta } from '$lib/page/load-state';
import type { Guardian, HealthRecord, PedagogicalNote, StaffMember } from '$lib/types/school';
import type { StudentDetailHost } from '../../../lib/student-detail-host';
import type { PageQueryRequest } from '../../../lib/student-page-status';
import { academicContext } from '$lib/academic/context.svelte';
import { recordsForStudent, listAllEntityPages, listAllEntityPagesByIds, uniqueIds } from '$lib/api/entity-list-filters';
import { updateStudentStatusMutation, upsertStudentHealthProfileMutation } from '$lib/api/mutations/student-ops.mutations';
import { mapGuardians } from '$lib/api/people-data';
import { stableRequestId, studentPhotoCommandStorageKey } from '$lib/api/profile-photo-request';
import { displayProfilePhotoUrl, uploadProfilePhoto } from '$lib/api/profile-photo-upload';
import { safeOptionalEntityList } from '$lib/api/safe-entity-access';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchStaffMembers } from '$lib/api/staff-data';
import { mapHealthProfiles, mapPedagogicalNotes, mapNoteCategory } from '$lib/api/student-360-data';
import { studentDetailIdFromPathname } from '$lib/api/student-detail-url';
import { authSession } from '$lib/auth/session.svelte';
import { dateInputToIso, formatDateInput, nowIso, todayDateInput } from '$lib/date/format';
import { t } from '$lib/i18n';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { VersionedRouteQuery } from '$lib/navigation/versioned-route-query';
import { studentIdentityPayload } from '$lib/people-profile-fields';
import { hasPermission } from '$lib/permissions';
import { getContext, setContext } from 'svelte';
import { get } from 'svelte/store';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { runStudentRouteMutation } from '../../../lib/student-route-mutation';

export function sortPedagogicalNotes(notes: readonly PedagogicalNote[], studentId: string): PedagogicalNote[] {
    return notes
        .filter(note => note.studentId === studentId)
        .sort((left, right) => right.date.localeCompare(left.date));
}
export const pedagogicalNoteToneByCategory: Record<PedagogicalNote['category'], string> = {
    Comportement: 'bg-destructive/10 text-destructive',
    Travail: 'bg-highlight-soft text-highlight',
    Progression: 'bg-secondary text-foreground/80',
    Encouragement: 'bg-secondary text-foreground/80',
};
export const pedagogicalNoteCategoryKeys: Record<PedagogicalNote['category'], string> = { Comportement: 'behavior', Travail: 'work', Progression: 'progress', Encouragement: 'encouragement' };
const STUDENT_PROFILE_TAB_KEY = Symbol('student-profile-tab');
type StudentNoteCategory = 'behavior' | 'work' | 'progress' | 'encouragement';
type StudentNoteVisibility = 'staff' | 'admin_only' | 'guardian_visible';
export interface StudentProfileTabSlice {
    studentId: string;
    health?: HealthRecord;
    pedagogicalNotes: PedagogicalNote[];
    guardians: Guardian[];
    staff: StaffMember[];
}
export type StudentProfileTabSeed = Partial<Omit<StudentProfileTabSlice, 'studentId'>>;
function emptySlice(studentId: string): StudentProfileTabSlice {
    return {
        studentId,
        pedagogicalNotes: [],
        guardians: [],
        staff: [],
    };
}
function schoolId(): string {
    return authSession.schoolId ?? academicContext.schools[0]?.id ?? '';
}
function studentInitials(firstName: string, lastName: string): string {
    return `${firstName.trim()[0] ?? ''}${lastName.trim()[0] ?? ''}`;
}
export type StudentProfileSection = 'portrait' | 'health' | 'guardians' | 'notes';
export class StudentProfileTabState {
    private readonly queries = Object.fromEntries(['portrait', 'health', 'guardians', 'notes'].map(section => [section, new VersionedRouteQuery(new RouteVersionSnapshot(['students', 'guardians', 'enrollments', 'staff', 'documents']))])) as Record<StudentProfileSection, VersionedRouteQuery>;
    invalidateIfStale = async () => { await Promise.all(Object.values(this.queries).map(query => query.invalidateIfStale())); };
    private generation = 0;
    private metadata = $state<Partial<Record<StudentProfileSection, PageLoadMeta & { identity: string }>>>({});
    statusFor(section: StudentProfileSection, studentId: string) {
 const value = this.metadata[section];
        return value?.identity === this.identity(studentId) ? value : undefined;
}

    identity(studentId: string) { return JSON.stringify([this.generation, academicContext.scopeGeneration, authSession.authUserId, authSession.schoolId, academicContext.yearId, studentId, authSession.grants]); }
    performUpsertStudentHealthProfile = (...args: Parameters<typeof upsertStudentHealthProfileMutation>) => upsertStudentHealthProfileMutation(...args);
    performUpdateStudentStatus = (...args: Parameters<typeof updateStudentStatusMutation>) => updateStudentStatusMutation(...args);
    slice = $state<StudentProfileTabSlice | null>(null);
    constructor(private readonly getPage: () => StudentDetailHost) {
    }

    get host(): StudentDetailHost {
        return this.getPage();
    }

    clear() {
        this.generation++;
        this.metadata = {};
        Object.values(this.queries).forEach(query => query.clear());
        this.slice = null;
    }

    seed(studentId: string, data: StudentProfileTabSeed) {
        if (!this.slice || this.slice.studentId !== studentId) {
            this.slice = { ...emptySlice(studentId), ...data, studentId };
            return;
        }
        this.slice = { ...this.slice, ...data, studentId };
    }

    private forStudent(studentId: string) {
        return this.slice?.studentId === studentId ? this.slice : null;
    }

    healthFor(studentId: string) {
        return this.forStudent(studentId)?.health;
    }

    notesFor(studentId: string) {
        const slice = this.forStudent(studentId);
        return slice ? sortPedagogicalNotes(slice.pedagogicalNotes, studentId) : [];
    }

    linkedGuardians(studentId: string) {
        return (this.forStudent(studentId)?.guardians ?? [])
            .filter(guardian => guardian.studentIds.includes(studentId));
    }

    availableGuardians(studentId: string) {
        return (this.forStudent(studentId)?.guardians ?? [])
            .filter(guardian => !guardian.studentIds.includes(studentId));
    }

    staffFor(studentId: string) {
        return this.forStudent(studentId)?.staff ?? [];
    }

    patchGuardian(id: string, patch: Partial<Guardian>) {
        if (!this.slice) {
            return;
        }
        this.slice = {
            ...this.slice,
            guardians: this.slice.guardians.map(guardian => guardian.id === id ? { ...guardian, ...patch } : guardian),
        };
    }

    appendNote(note: PedagogicalNote) {
        if (!this.slice) {
            return;
        }
        this.slice = {
            ...this.slice,
            pedagogicalNotes: [...this.slice.pedagogicalNotes, note],
        };
    }

    removeNote(id: string) {
        if (!this.slice) {
            return;
        }
        this.slice = {
            ...this.slice,
            pedagogicalNotes: this.slice.pedagogicalNotes.filter(note => note.id !== id),
        };
    }

    patchNote(id: string, patch: Partial<PedagogicalNote>) {
        if (!this.slice) {
            return;
        }
        this.slice = {
            ...this.slice,
            pedagogicalNotes: this.slice.pedagogicalNotes.map(note => note.id === id ? { ...note, ...patch } : note),
        };
    }

    query(section: StudentProfileSection = 'notes') {
        return this.queries[section].track(async (url: URL, request?: PageQueryRequest) => {
            const studentId = studentDetailIdFromPathname(url.pathname);
            const student = studentId ? this.host.findStudent(studentId) : undefined;
            const permission = section === 'health' ? 'STUDENT_HEALTH_READ' : section === 'guardians' ? 'PARENT_READ' : 'STUDENT_READ';
            if (!hasPermission(permission, { classId: student?.classId, studentId: studentId ?? undefined }))
                return { status: 'denied' as const };
            const identity = this.identity(studentId ?? '');
            this.metadata[section] = { identity, status: 'loading' };
            const result = await resolveStudentPageLoad(url, {
                empty: () => ({}),
                errorMessage: get(t)('dataState.errorDefault'),
                load: async (signal) => {
                    if (!studentId)
return {};
                    const captured = this.identity(studentId);
                    const client = getBrowserSchoolClient();
                    let data: StudentProfileTabSeed = {};
                    if (section === 'health') {
                        const rows = await client.entities.studentHealthProfiles.list(recordsForStudent(studentId));
                        data = { health: mapHealthProfiles(rows)[studentId] };
                    }
                    else if (section === 'notes') {
                        const [notes, staff] = await Promise.all([
                            client.entities.studentNotes.list(recordsForStudent(studentId)),
                            hasPermission('STAFF_READ') && schoolId() && academicContext.yearId ? safeOptionalEntityList(() => fetchStaffMembers(client, { schoolId: schoolId(), academicYearId: academicContext.yearId })) : Promise.resolve([]),
                        ]);
                        data = { pedagogicalNotes: mapPedagogicalNotes(notes), staff };
                    }
                    else if (section === 'guardians') {
                        const links = await listAllEntityPages(query => client.entities.guardianLinks.list(query), { baseQuery: recordsForStudent(studentId) });
                        const guardians = await listAllEntityPagesByIds(query => client.entities.guardians.list(query), uniqueIds(links.map(link => link.guardianId)));
                        data = { guardians: mapGuardians(guardians, links) };
                    }
                    else {
 await this.host.loadPendingPhotoReviews();
}
                    signal.throwIfAborted();
                    if (captured !== this.identity(studentId))
throw new DOMException('Context changed', 'AbortError');
                    this.seed(studentId, data);
                    return {};
                },
                hasItems: () => true,
            }, request);
            if (identity === this.identity(studentId ?? ''))
this.metadata[section] = { ...result, identity };
            return result;
        });
    }

    async updateStatus(studentId: string, status: 'active' | 'inactive' | 'archived') {
        const captured = this.identity(studentId);
        const student = this.host.findStudent(studentId);
        if (!student || !hasPermission('STUDENT_MANAGE', { classId: student.classId, studentId }))
return false;
        const ok = await this.performUpdateStudentStatus({ studentId, status, successMessage: get(t)('student.statusUpdated') });
        if (ok && captured === this.identity(studentId))
this.host.patchStudent(studentId, { status });
        return ok;
    }

    async updateProfile(input: {
        studentId: string;
        profile?: Record<string, string>;
        firstName: string;
        lastName: string;
        birthDate?: string;
        successMessage?: string;
    }): Promise<boolean> {
        const page = this.getPage();
        const client = getBrowserSchoolClient();
        const previous = page.findStudent(input.studentId);
        const nextName = `${input.firstName.trim()} ${input.lastName.trim()}`;
        const nextBirthdate = input.birthDate === undefined ? previous?.birthdate ?? '' : formatDateInput(input.birthDate);
        const birthDatePatch = input.birthDate === undefined || input.birthDate === previous?.birthdate ? {} : { birthDate: dateInputToIso(input.birthDate) ?? null };
        const result = await runStudentRouteMutation({
            request: () => client.commands.updateStudentProfile({
                studentId: input.studentId,
                ...studentIdentityPayload(input.profile, previous),
                firstName: input.firstName.trim(),
                lastName: input.lastName.trim(),
                ...birthDatePatch,
            }),
            successMessage: input.successMessage,
            versionKeys: ['students'],
            apply: () => {
                page.patchStudent(input.studentId, {
                    ...studentIdentityPayload(input.profile, previous),
                    firstName: input.firstName.trim(),
                    lastName: input.lastName.trim(),
                    name: nextName,
                    initials: studentInitials(input.firstName, input.lastName),
                    birthdate: nextBirthdate,
                });
            },
            rollback: () => {
                if (previous) {
                    page.patchStudent(input.studentId, previous);
                }
            },
        });
        return result !== null;
    }

    async updateProfilePhoto(input: {
        studentId: string;
        file: File;
        successMessage?: string;
    }): Promise<boolean> {
        const page = this.getPage();
        const resolvedSchoolId = schoolId();
        if (!resolvedSchoolId) {
            return false;
        }
        const previous = page.findStudent(input.studentId);
        const previousPending = page.pendingPhotoFor(input.studentId);
        const result = await runStudentRouteMutation({
            request: async () => {
                const uploaded = await uploadProfilePhoto({
                    ownerKind: 'student',
                    ownerId: input.studentId,
                    file: input.file,
                    schoolId: resolvedSchoolId,
                });
                await getBrowserSchoolClient().commands.publishStudentPhoto({
                    requestId: stableRequestId(studentPhotoCommandStorageKey('publish', input.studentId)),
                    studentId: input.studentId,
                    attachmentId: uploaded.attachmentId,
                });
                return {
                    photoUrl: displayProfilePhotoUrl(uploaded.attachmentId),
                    photoAttachmentId: uploaded.attachmentId,
                };
            },
            successMessage: input.successMessage,
            versionKeys: ['students'],
            onSuccess: ({ photoUrl, photoAttachmentId }) => {
                page.patchStudent(input.studentId, { photoUrl, photoAttachmentId });
                page.pendingPhotoSubmissions = page.pendingPhotoSubmissions.filter(submission => submission.studentId !== input.studentId);
            },
            rollback: () => {
                page.patchStudent(input.studentId, {
                    photoUrl: previous?.photoUrl ?? null,
                    photoAttachmentId: previous?.photoAttachmentId ?? null,
                });
                if (previousPending && !page.pendingPhotoFor(input.studentId)) {
                    page.pendingPhotoSubmissions = [...page.pendingPhotoSubmissions, previousPending];
                }
            },
        });
        return result !== null;
    }

    async approvePendingPhoto(input: {
        studentId: string;
        successMessage?: string;
    }): Promise<boolean> {
        const page = this.getPage();
        const pending = page.pendingPhotoFor(input.studentId);
        if (!pending) {
            return false;
        }
        const previous = page.findStudent(input.studentId);
        const result = await runStudentRouteMutation({
            request: () => getBrowserSchoolClient().commands.reviewStudentPhoto({
                requestId: stableRequestId(studentPhotoCommandStorageKey('review', input.studentId)),
                submissionId: pending.id,
                expectedVersion: pending.version,
                decision: 'approve',
            }),
            successMessage: input.successMessage,
            versionKeys: ['students'],
            onSuccess: () => {
                page.patchStudent(input.studentId, {
                    photoUrl: displayProfilePhotoUrl(pending.attachmentId),
                    photoAttachmentId: pending.attachmentId,
                });
                page.pendingPhotoSubmissions = page.pendingPhotoSubmissions.filter(submission => submission.id !== pending.id);
            },
            rollback: () => {
                if (previous) {
                    page.patchStudent(input.studentId, previous);
                }
                if (!page.pendingPhotoFor(input.studentId)) {
                    page.pendingPhotoSubmissions = [...page.pendingPhotoSubmissions, pending];
                }
            },
        });
        return result !== null;
    }

    async rejectPendingPhoto(input: {
        studentId: string;
        rejectionReason: string;
        successMessage?: string;
    }): Promise<boolean> {
        const page = this.getPage();
        const pending = page.pendingPhotoFor(input.studentId);
        if (!pending) {
            return false;
        }
        const result = await runStudentRouteMutation({
            request: () => getBrowserSchoolClient().commands.reviewStudentPhoto({
                requestId: stableRequestId(studentPhotoCommandStorageKey('review', input.studentId)),
                submissionId: pending.id,
                expectedVersion: pending.version,
                decision: 'reject',
                rejectionReason: input.rejectionReason.trim(),
            }),
            successMessage: input.successMessage,
            versionKeys: ['students'],
            onSuccess: () => {
                page.pendingPhotoSubmissions = page.pendingPhotoSubmissions.filter(submission => submission.id !== pending.id);
            },
            rollback: () => {
                if (!page.pendingPhotoFor(input.studentId)) {
                    page.pendingPhotoSubmissions = [...page.pendingPhotoSubmissions, pending];
                }
            },
        });
        return result !== null;
    }

    async linkGuardian(input: {
        guardianId: string;
        relationshipFields?: import('$lib/smart-components/guardian-relationship/guardian-relationship-state.svelte').GuardianRelationshipFields;
        studentId: string;
        relationship?: string;
        successMessage?: string;
    }): Promise<boolean> {
        const page = this.getPage();
        const client = getBrowserSchoolClient();
        const id = `gl-${input.guardianId}-${input.studentId}`;
        const previousGuardian = this.slice?.guardians.find(guardian => guardian.id === input.guardianId);
        const previousStudent = page.findStudent(input.studentId);
        const result = await runStudentRouteMutation({
            request: () => client.commands.linkGuardianToStudent({
                id,
                guardianId: input.guardianId,
                studentId: input.studentId,
                relationship: input.relationship ?? 'parent',
                isPrimary: false,
                isBillingContact: false,
                legalGuardian: false,
                canPickup: false,
                emergencyContactPriority: null,
                receivesAcademicReports: true,
                receivesAttendanceAlerts: true,
                contactRestrictions: null,
                notes: null,
                ...input.relationshipFields,
                createdAt: nowIso(),
            }),
            successMessage: input.successMessage,
            versionKeys: ['students', 'guardians'],
            apply: () => {
                if (previousGuardian && !previousGuardian.studentIds.includes(input.studentId)) {
                    this.patchGuardian(input.guardianId, {
                        studentIds: [...previousGuardian.studentIds, input.studentId],
                    });
                }
                if (previousStudent && previousGuardian) {
                    page.patchStudent(input.studentId, {
                        guardian: previousGuardian.name,
                    });
                }
            },
            rollback: () => {
                if (previousGuardian) {
                    this.patchGuardian(input.guardianId, {
                        studentIds: previousGuardian.studentIds,
                    });
                }
                if (previousStudent) {
                    page.patchStudent(input.studentId, {
                        guardian: previousStudent.guardian,
                    });
                }
            },
        });
        return result !== null;
    }

    async createNote(input: {
        studentId: string;
        title?: string | null;
        category: StudentNoteCategory;
        body: string;
        visibility?: StudentNoteVisibility;
        successMessage?: string;
    }): Promise<boolean> {
        const client = getBrowserSchoolClient();
        const id = `note-${input.studentId}-${crypto.randomUUID()}`;
        const now = todayDateInput();
        const optimisticNote: PedagogicalNote = {
            id,
            studentId: input.studentId,
            date: now,
            authorId: authSession.userProfile?.id ?? '',
            category: mapNoteCategory(input.category, input.title),
            content: input.body.trim(),
            title: input.title,
            visibility: input.visibility ?? 'staff',
        };
        const result = await runStudentRouteMutation({
            request: () => client.commands.createStudentNote({
                id,
                studentId: input.studentId,
                title: input.title ?? null,
                category: input.category,
                body: input.body.trim(),
                visibility: input.visibility ?? 'staff',
                createdAt: nowIso(),
            }),
            successMessage: input.successMessage,
            versionKeys: ['students'],
            apply: () => {
                this.appendNote(optimisticNote);
            },
            rollback: () => {
                this.removeNote(id);
            },
        });
        return result !== null;
    }

    async updateNote(input: {
        noteId: string;
        studentId: string;
        title?: string | null;
        category: StudentNoteCategory;
        body: string;
        visibility?: StudentNoteVisibility;
        successMessage?: string;
    }): Promise<boolean> {
        const client = getBrowserSchoolClient();
        const previous = this.slice?.pedagogicalNotes.find(note => note.id === input.noteId);
        const result = await runStudentRouteMutation({
            request: () => client.commands.updateStudentNote({
                noteId: input.noteId,
                title: input.title,
                category: input.category,
                body: input.body.trim(),
                visibility: input.visibility ?? previous?.visibility ?? 'staff',
                updatedAt: nowIso(),
            }),
            successMessage: input.successMessage,
            versionKeys: ['students'],
            apply: () => {
                this.patchNote(input.noteId, {
                    category: mapNoteCategory(input.category),
                    content: input.body.trim(),
                    title: input.title,
                    visibility: input.visibility,
                });
            },
            rollback: () => {
                if (previous) {
                    this.patchNote(input.noteId, previous);
                }
            },
        });
        return result !== null;
    }
}
export function setStudentProfileTabState(state: StudentProfileTabState) {
    setContext(STUDENT_PROFILE_TAB_KEY, state);
}
export function getStudentProfileTabState() {
    return getContext<StudentProfileTabState>(STUDENT_PROFILE_TAB_KEY);
}

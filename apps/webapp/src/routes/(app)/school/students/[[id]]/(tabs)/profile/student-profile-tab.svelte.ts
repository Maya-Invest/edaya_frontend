import type { Guardian, HealthRecord, PedagogicalNote, StaffMember } from '$lib/types/school';
import type { StudentsPageState } from '../../../students-page.svelte';
import { academicContext } from '$lib/academic/context.svelte';
import { loadGuardiansPeopleData } from '$lib/api/people-data';
import { uploadProfilePhoto, withPhotoCacheBust } from '$lib/api/profile-photo-upload';
import { safeOptionalEntityList, safeOptionalFetch } from '$lib/api/safe-entity-access';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { fetchStaffMembers } from '$lib/api/staff-data';
import { mapNoteCategory, loadStudent360Data } from '$lib/api/student-360-data';
import { studentDetailIdFromPathname } from '$lib/api/student-detail-url';
import { authSession } from '$lib/auth/session.svelte';
import { dateInputToIso, formatDateInput, nowIso, todayDateInput } from '$lib/date/format';
import { getContext, setContext } from 'svelte';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { runStudentRouteMutation } from '../../../lib/student-route-mutation';

export function sortPedagogicalNotes(
	notes: readonly PedagogicalNote[],
	studentId: string,
): PedagogicalNote[] {
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

export class StudentProfileTabState {
	slice = $state<StudentProfileTabSlice | null>(null);

	constructor(private readonly getPage: () => StudentsPageState) {}

	clear() {
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
			guardians: this.slice.guardians.map(guardian =>
				guardian.id === id ? { ...guardian, ...patch } : guardian,
			),
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
			pedagogicalNotes: this.slice.pedagogicalNotes.map(note =>
				note.id === id ? { ...note, ...patch } : note,
			),
		};
	}

	query() {
		return (url: URL) => resolveStudentPageLoad(url, {
			empty: () => ({}),
			load: async () => {
				const studentId = studentDetailIdFromPathname(url.pathname);
				if (!studentId) {
					return {};
				}

				const client = getBrowserSchoolClient();
				const scope = {
					schoolId: schoolId(),
					academicYearId: academicContext.yearId,
				};
				const [{ healthRecord, pedagogicalNotes }, guardiansData, staff] = await Promise.all([
					safeOptionalFetch(
						() => loadStudent360Data(client, studentId),
						{ healthRecord: undefined, pedagogicalNotes: [] },
					),
					loadGuardiansPeopleData(client).catch(() => ({
						guardians: [],
						students: [],
						totalGuardians: 0,
					})),
					scope.schoolId && scope.academicYearId
						? safeOptionalEntityList(() => fetchStaffMembers(client, scope))
						: Promise.resolve([]),
				]);

				this.seed(studentId, {
					health: healthRecord,
					pedagogicalNotes,
					guardians: guardiansData.guardians,
					staff,
				});
				return {};
			},
			hasItems: () => true,
		});
	}

	async updateProfile(input: {
		studentId: string;
		firstName: string;
		lastName: string;
		birthDate?: string;
		successMessage?: string;
	}): Promise<boolean> {
		const page = this.getPage();
		const client = getBrowserSchoolClient();
		const previous = page.findStudent(input.studentId);
		const nextName = `${input.firstName.trim()} ${input.lastName.trim()}`;
		const nextBirthdate = formatDateInput(dateInputToIso(input.birthDate ?? '') ?? previous?.birthdate ?? '');

		const result = await runStudentRouteMutation({
			request: () => client.commands.updateStudentProfile({
				studentId: input.studentId,
				firstName: input.firstName.trim(),
				lastName: input.lastName.trim(),
				birthDate: dateInputToIso(input.birthDate ?? '') ?? null,
			}),
			successMessage: input.successMessage,
			versionKeys: ['students'],
			apply: () => {
				page.patchStudent(input.studentId, {
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

		const previous = page.findStudent(input.studentId)?.photoUrl ?? null;

		const result = await runStudentRouteMutation({
			request: async () => {
				const uploaded = await uploadProfilePhoto({
					ownerKind: 'student',
					ownerId: input.studentId,
					file: input.file,
					schoolId: resolvedSchoolId,
				});
				const photoUrl = withPhotoCacheBust(uploaded.photoUrl);
				await getBrowserSchoolClient().commands.updateStudentProfile({
					studentId: input.studentId,
					photoUrl,
				});
				return photoUrl;
			},
			successMessage: input.successMessage,
			versionKeys: ['students'],
			onSuccess: (photoUrl) => {
				page.patchStudent(input.studentId, { photoUrl });
			},
			rollback: () => {
				page.patchStudent(input.studentId, { photoUrl: previous });
			},
		});

		return result !== null;
	}

	async linkGuardian(input: {
		guardianId: string;
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
				category: input.category,
				body: input.body.trim(),
				visibility: input.visibility ?? 'staff',
				updatedAt: nowIso(),
			}),
			successMessage: input.successMessage,
			versionKeys: ['students'],
			apply: () => {
				this.patchNote(input.noteId, {
					category: mapNoteCategory(input.category),
					content: input.body.trim(),
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

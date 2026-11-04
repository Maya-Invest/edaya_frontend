import type { components } from '$lib/api/schema';
import type { PageLoadMeta } from '$lib/page/load-state';
import type { StudentEnrollmentHistoryItem } from '$lib/types/school';
import type { StudentDetailHost } from '../../../lib/student-detail-host';
import type { PageQueryRequest } from '../../../lib/student-page-status';
import { academicContext } from '$lib/academic/context.svelte';
import { listAllEntityPages } from '$lib/api/entity-list-filters';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { studentDetailIdFromPathname } from '$lib/api/student-detail-url';
import { loadStudentEnrollmentHistory } from '$lib/api/student-drawer-data';
import { authSession } from '$lib/auth/session.svelte';
import { RouteVersionSnapshot } from '$lib/navigation/route-version-snapshot';
import { VersionedRouteQuery } from '$lib/navigation/versioned-route-query';
import { hasPermission } from '$lib/permissions';
import { getContext, setContext } from 'svelte';
import { SvelteDate, SvelteSet } from 'svelte/reactivity';
import { resolveStudentPageLoad } from '../../../lib/student-page-status';
import { runStudentRouteMutation } from '../../../lib/student-route-mutation';

const STUDENT_ENROLLMENTS_TAB_KEY = Symbol('student-enrollments-tab');
export interface StudentEnrollmentsTabSlice {
	studentId: string;
	enrollments: StudentEnrollmentHistoryItem[];
	participation?: components['schemas']['StudentSubjectEnrollmentsResponse'];
}
export type StudentEnrollmentsTabSeed = Partial<Omit<StudentEnrollmentsTabSlice, 'studentId'>>;
function emptySlice(studentId: string): StudentEnrollmentsTabSlice {
	return { studentId, enrollments: [] };
}
export class StudentEnrollmentsTabState {
	private readonly queries = Object.fromEntries(['history', 'subjects'].map(section => [section, new VersionedRouteQuery(new RouteVersionSnapshot(['students', 'enrollments', 'subjectEnrollments', 'subjects', 'attendance', 'evaluations', 'reportCards', 'planning']))])) as Record<'history' | 'subjects', VersionedRouteQuery>;
	invalidateIfStale = async () => { await Promise.all(Object.values(this.queries).map(query => query.invalidateIfStale())); };
	private generation = 0;
	private historyLoad = $state<({ identity: string } & PageLoadMeta) | null>(null);
	private historyUrl?: URL;
	historyStatusFor(studentId: string): PageLoadMeta {
		if (!hasPermission('ENROLLMENT_READ', { studentId, classId: this.getPage().findStudent(studentId)?.classId }))
			return { status: 'denied' };
		return this.historyLoad?.identity === this.identity(studentId) ? this.historyLoad : { status: 'loading' };
	}

	async retryHistory() {
		if (this.historyUrl)
			await this.query('history')(this.historyUrl);
	}

	activePlacementFor(studentId: string) {
		if (this.historyStatusFor(studentId).status !== 'ready')
			return undefined;
		return this.enrollmentsFor(studentId).find(row => row.academicYearId === academicContext.yearId && row.status === 'active');
	}

	hasPreviousPlacements(studentId: string) {
		if (this.historyStatusFor(studentId).status !== 'ready')
			return false;
		const year = academicContext.years.find(row => row.id === academicContext.yearId);
		return this.enrollmentsFor(studentId).some(row => row.status === 'closed'
			|| (year && row.academicYearId !== year.id && row.enrolledAt < year.startDate));
	}

	private identity(studentId: string) { return JSON.stringify([this.generation, authSession.authUserId, authSession.schoolId, academicContext.yearId, studentId, authSession.grants]); }
	slice = $state<StudentEnrollmentsTabSlice | null>(null);
	constructor(private readonly getPage: () => StudentDetailHost) {
	}

	clear() {
		this.generation++;
		this.historyLoad = null;
		this.historyUrl = undefined;
		Object.values(this.queries).forEach(query => query.clear());
		this.slice = null;
	}

	seed(studentId: string, data: StudentEnrollmentsTabSeed) {
		if (!this.slice || this.slice.studentId !== studentId) {
			this.slice = { ...emptySlice(studentId), ...data, studentId };
			return;
		}
		this.slice = { ...this.slice, ...data, studentId };
	}

	private forStudent(studentId: string) {
		return this.slice?.studentId === studentId ? this.slice : null;
	}

	enrollmentsFor(studentId: string) {
		return this.forStudent(studentId)?.enrollments ?? [];
	}

	query(section: 'history' | 'subjects' = 'history') {
		return this.queries[section].track(async (url: URL, request?: PageQueryRequest): Promise<PageLoadMeta> => {
			const id = studentDetailIdFromPathname(url.pathname);
			const capturedIdentity = id ? this.identity(id) : '';
			if (section === 'history') {
				this.historyUrl = url;
				this.historyLoad = { identity: capturedIdentity, status: 'loading' };
			}
			if (!hasPermission('ENROLLMENT_READ', { studentId: id ?? undefined, classId: id ? this.getPage().findStudent(id)?.classId : undefined }))
				return Promise.resolve({ status: 'denied' as const });
			const result = await resolveStudentPageLoad(url, {
			empty: () => ({}),
			load: async (signal) => {
				const studentId = studentDetailIdFromPathname(url.pathname);
				if (!studentId) {
					return {};
				}
				const captured = this.identity(studentId);
				const student = this.getPage().findStudent(studentId);
				if (!hasPermission('ENROLLMENT_READ', { studentId, classId: student?.classId }))
					return { denied: true };
				const data = section === 'history' ? { enrollments: await loadStudentEnrollmentHistory(getBrowserSchoolClient(), studentId) } : { participation: await getBrowserSchoolClient().queries.getStudentSubjectEnrollments({ studentId, academicYearId: academicContext.yearId || undefined }) };
				signal.throwIfAborted();
				if (captured !== this.identity(studentId))
					throw new DOMException('Context changed', 'AbortError');
				this.seed(studentId, data);
				if ('enrollments' in data) {
					const active = data.enrollments?.find(row => row.academicYearId === academicContext.yearId && row.status === 'active');
					if (active && (student?.classId !== active.classGroupId || student.enrollmentId !== active.id))
						this.getPage().patchStudent(studentId, { classId: active.classGroupId, enrollmentId: active.id });
				}
				return {};
			},
			hasItems: () => true,
		}, request);
			if (section === 'history' && id && capturedIdentity === this.identity(id) && !request?.signal.aborted)
				this.historyLoad = { identity: capturedIdentity, ...result };
			return result;
		});
	}

	async readPlacement(studentId: string, yearId: string) {
		const captured = this.identity(studentId);
		const rows = await loadStudentEnrollmentHistory(getBrowserSchoolClient(), studentId);
		if (captured !== this.identity(studentId) || academicContext.yearId !== yearId || (this.historyUrl && studentDetailIdFromPathname(this.historyUrl.pathname) !== studentId))
			throw new DOMException('Context changed', 'AbortError');
		this.seed(studentId, { enrollments: rows });
		this.historyLoad = { identity: captured, status: 'ready' };
		const active = rows.find(row => row.academicYearId === yearId && row.status === 'active');
		const current = this.getPage().findStudent(studentId);
		if (active && (current?.classId !== active.classGroupId || current.enrollmentId !== active.id))
			this.getPage().patchStudent(studentId, { classId: active.classGroupId, enrollmentId: active.id });
		return active;
	}

	async assignClass(studentId: string, classGroupId: string, enrollmentId: string) {
		const captured = this.identity(studentId);
		const result = await runStudentRouteMutation({
			request: () => getBrowserSchoolClient().commands.enrollStudent({ id: enrollmentId, studentId, classGroupId, createdAt: new SvelteDate().toISOString() }),
			versionKeys: ['students', 'enrollments', 'subjectEnrollments'],
		});
		if (result && captured === this.identity(studentId)) {
			this.getPage().patchStudent(studentId, { classId: result.classGroupId, enrollmentId: result.id });
			await this.invalidateIfStale();
		}
		return result !== null;
	}

	async previewTransfer(studentId: string, enrollmentId: string, nextClassGroupId: string) {
		const client = getBrowserSchoolClient();
		const [data, destination] = await Promise.all([
			client.queries.getStudentSubjectEnrollments({ studentId }),
			listAllEntityPages(query => client.entities.classSubjects.list(query), { baseQuery: { classGroupId: nextClassGroupId } }),
		]);
		const now = new SvelteDate().toISOString();
		const choices = new SvelteSet(data.enrollments.filter(row => row.studentClassEnrollmentId === enrollmentId && !row.deletedAt && (!row.endedAt || row.endedAt > now) && (row.scope === 'annual' || row.periods.some(period => period.endsAt > now))).map(row => row.classSubjectId));
		return data.offerings.filter(row => choices.has(row.id) && row.isOptional && !destination.some(target => target.subjectId === row.subjectId && target.isOffered)).map(row => ({ subjectId: row.subjectId, name: row.name }));
	}

	async transferClass(input: {
		enrollmentId: string;
		studentId: string;
		nextClassGroupId: string;
		successMessage?: string;
		acknowledgedDroppedSubjectIds?: string[];
	}): Promise<boolean> {
		const page = this.getPage();
		const client = getBrowserSchoolClient();
		const previous = page.findStudent(input.studentId);
		const nextEnrollmentId = `enr-${input.studentId}-${crypto.randomUUID()}`;
		const result = await runStudentRouteMutation({
			request: () => client.commands.transferStudent({
				enrollmentId: input.enrollmentId,
				nextEnrollmentId,
				nextClassGroupId: input.nextClassGroupId,
				acknowledgedDroppedSubjectIds: input.acknowledgedDroppedSubjectIds,
				effectiveAt: new SvelteDate().toISOString(),
			}),
			successMessage: input.successMessage,
			versionKeys: ['students', 'enrollments', 'subjectEnrollments', 'subjects', 'attendance', 'evaluations', 'reportCards', 'planning'],
			apply: () => {
				page.patchStudent(input.studentId, {
					classId: input.nextClassGroupId,
					enrollmentId: nextEnrollmentId,
				});
			},
			rollback: () => {
				if (previous) {
					page.patchStudent(input.studentId, previous);
				}
			},
		});
		if (result !== null)
			await this.invalidateIfStale();
		return result !== null;
	}
}
export function setStudentEnrollmentsTabState(state: StudentEnrollmentsTabState) {
	setContext(STUDENT_ENROLLMENTS_TAB_KEY, state);
}
export function getStudentEnrollmentsTabState() {
	return getContext<StudentEnrollmentsTabState>(STUDENT_ENROLLMENTS_TAB_KEY);
}

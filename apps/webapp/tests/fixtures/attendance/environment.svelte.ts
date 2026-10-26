import { writable } from 'svelte/store';

export const academicContext = $state({ schoolScopeId: 'school', scopeGeneration: 0, yearId: 'year', schools: [{ id: 'school', timeZone: 'America/Toronto' }], classes: [{ id: 'a', schoolId: 'school', name: 'Class A', attendanceMode: 'daily' }] });
export const authSession = $state({ userId: 'staff' });
export const controls = $state({ failedStudent: new URL(window.location.href).searchParams.get('fail-student'), sessionRequests: [] as Array<Record<string, unknown>>, allowed: !new URL(window.location.href).searchParams.has('denied'), failWrite: false, failRoster: false, empty: false, requests: [] as Array<{ date: string; attendanceByStudent: Record<string, string> }> });
export const hasPermission = () => controls.allowed;
function snapshot() { return { url: new URL(window.location.href), state: window.history.state ?? {}, params: { classId: 'a' } }; }
export const page = writable(snapshot());
window.addEventListener('popstate', () => page.set(snapshot()));
export async function appGoto(href: string, options: { replaceState?: boolean; state?: object } = {}) {
	window.history[options.replaceState ? 'replaceState' : 'pushState'](options.state ?? {}, '', href);
	page.set(snapshot());
}
export const rows = [
	{ id: 's1', firstName: 'Alice', lastName: 'Tremblay' },
	{ id: 's2', firstName: 'Benjamin', lastName: 'Alexandre de la Fontaine-Montgomery' },
	{ id: 's3', firstName: 'Charlie', lastName: 'Martin' },
];
function saved(): Array<{ date: string; attendanceByStudent: Record<string, string> }> { return JSON.parse(localStorage.getItem('attendance-fixture') ?? '[]'); }
function occurrences() { return saved().map(row => ({ id: `a:${row.date}`, classGroupId: 'a', schoolId: 'school', startsAt: `${row.date}T00:00:00Z`, displayLabel: 'Daily roll call' })); }
function records() { return saved().flatMap(row => Object.entries(row.attendanceByStudent).map(([studentId, status]) => ({ id: `${studentId}-${row.date}`, attendanceId: `a:${row.date}`, studentId, status }))); }
export const sessionMarks = $state<Record<string, string>>({});
const sessionEntity = { get: async () => ({ id: 'session', classGroupId: 'a', classSubjectId: 'subject', startsAt: '2026-10-25T14:00:00Z', title: 'Mathematics' }) };
const client = {
	queries: { getClassSubjectRoster: async () => ({ students: rows.map(row => ({ id: row.id })) }) },
	entities: {
		lessonSessions: sessionEntity, activitySessions: sessionEntity, assessments: sessionEntity,
		enrollments: { list: async () => { if (controls.failRoster) throw new Error('Roster unavailable'); return controls.empty ? [] : rows.map(row => ({ id: row.id, studentId: row.id, classGroupId: 'a', status: 'active' })); } },
		students: { list: async () => rows },
		attendances: { list: async () => occurrences(), get: async (id: string) => occurrences().find(row => row.id === id) },
		attendance: { list: async () => location.pathname.includes('/timetable/') ? Object.entries(sessionMarks).map(([studentId, status]) => ({ id: `server-${studentId}`, studentId, status })) : records() },
		guardianLinks: { list: async () => [] }, guardians: { list: async () => [] },
	},
	commands: {
		recordAttendance: async (input: { studentId: string; status: string; id: string }) => {
			controls.sessionRequests.push(input);
			await new Promise(resolve => setTimeout(resolve, 150));
			if (input.studentId === controls.failedStudent) { controls.failedStudent = null; throw new Error('Fixture write failure'); }
			sessionMarks[input.studentId] = input.status;
			return input;
		},
		recordLessonSessionAttendance: async (input: { attendanceByStudent: Record<string, string> }) => {
			controls.sessionRequests.push(input);
			await new Promise(resolve => setTimeout(resolve, 150));
			Object.assign(sessionMarks, input.attendanceByStudent);
			return Object.entries(input.attendanceByStudent).map(([studentId, status]) => ({ id: `server-${studentId}`, studentId, status }));
		},
		recordClassDailyAttendance: async (input: { date: string; attendanceByStudent: Record<string, string> }) => {
		controls.requests.push(input);
		await new Promise(resolve => setTimeout(resolve, 100));
		if (controls.failWrite) {
			controls.failWrite = false;
			throw new Error('Save unavailable');
		}
		localStorage.setItem('attendance-fixture', JSON.stringify([...saved(), input]));
		return records();
	} },
};
export const getBrowserSchoolClient = () => client;
export const requestDocumentIssuanceMutation = async () => {};
export const attendanceSheetSourceId = () => '';
export function appPath(path: string, params: Record<string, string> = {}) {
	return path.replace('/(app)', '').replace(/\[\[?(\w+)\]?\]/g, (_, key) => encodeURIComponent(params[key] ?? ''));
}

import { plugin } from 'bun';
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'directory-columns-runes', setup(build) {
    build.onLoad({ filter: /directory-columns-state\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await Bun.file(path).text()), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
const academic = { yearId: 'year-1', year: { label: '2026–2027' }, classes: [] };
const session = { subjectId: 'user', schoolId: 'school', grants: [] as string[] };
const versions = { students: 0, guardians: 0, teachers: 0, staff: 0, subjects: 0, teacherUnavailabilities: 0, enrollments: 0 };
const permissions = new Set<string>();
const restricted = new Set<string>();
const calls: Array<{ entity: string; query: Record<string, unknown> }> = [];
const downloads: Array<readonly (readonly (string | number)[])[]> = [];
const data: Record<string, Record<string, unknown>[]> = {};
let waitForRead: Promise<void> | undefined;
const allowed = (permission: string, ctx?: { studentId?: string }) => permissions.has(permission) && (!ctx?.studentId || !restricted.has(ctx.studentId));
const client = { entities: new Proxy({}, { get: (_, entity: string) => ({ list: async (query: Record<string, unknown>) => {
    calls.push({ entity, query });
    await waitForRead;
    const ids = (query.studentId as { $in?: string[] } | undefined)?.$in;
    return (data[entity] ?? []).filter(row => !ids || ids.includes(String(row.studentId)));
} }) }) };
mock.module('$lib/academic/context.svelte', () => ({ academicContext: academic }));
mock.module('$lib/auth/session.svelte', () => ({ authSession: session }));
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => client }));
mock.module('$lib/entity-versions.svelte', () => ({ entityVersions: versions }));
mock.module('$lib/permissions', () => ({ hasPermission: allowed, hasAnyPermission: (keys: string[]) => keys.some(key => allowed(key)) }));
mock.module('$lib/i18n', () => ({ t: { subscribe(fn: (value: (key: string) => string) => void) { fn(key => key); return () => {}; } } }));
mock.module('$lib/list/list-csv-export', () => ({ downloadCsv: (_name: string, rows: readonly (readonly (string | number)[])[]) => downloads.push(rows) }));
mock.module('$lib/queries/page-status', () => ({ listPageHasItems: () => true, resolvePageLoad: () => {} }));
const { DirectoryColumnsState } = await import('../../src/lib/smart-components/directory-columns/directory-columns-state.svelte');
const rows = [{ id: 'allowed', classId: 'class-a', firstName: 'Aminata' }, { id: 'restricted', classId: 'class-b', firstName: 'Issa' }, { id: 'empty', classId: 'class-a', firstName: 'Fatou' }];
beforeEach(() => {
    permissions.clear(); restricted.clear(); calls.length = 0; downloads.length = 0;
    for (const key of Object.keys(data)) delete data[key];
    session.subjectId = 'user'; session.schoolId = 'school'; session.grants = [];
    academic.yearId = 'year-1'; waitForRead = undefined;
});
describe('authorized directory columns and exports', () => {
    test('health is lazy, batch-loaded only for eligible people, and distinguishes missing from restricted', async () => {
        permissions.add('STUDENT_HEALTH_READ'); restricted.add('restricted');
        data.studentHealthProfiles = [{ studentId: 'allowed', medicalConditions: 'Unrestricted, original condition text' }];
        const state = new DirectoryColumnsState('student');
        state.keys = ['firstName']; await state.load(rows);
        expect(calls).toHaveLength(0);
        state.keys = ['firstName', 'health.medicalConditions']; await state.load(rows);
        expect(calls).toHaveLength(1);
        expect(calls[0]?.query.studentId).toEqual({ $in: ['allowed', 'empty'] });
        expect(state.value(rows[0]!, 'health.medicalConditions')).toBe('Unrestricted, original condition text');
        expect(state.value(rows[1]!, 'health.medicalConditions')).toBe('profile.restricted');
        expect(state.value(rows[2]!, 'health.medicalConditions')).toBe('profile.notProvided');
        academic.yearId = '';
        await state.load(rows);
        expect(state.value(rows[0]!, 'health.medicalConditions')).toBe('Unrestricted, original condition text');
        expect(state.identity(rows)).not.toBe(state.identity(rows.map(row => ({ ...row, classId: 'transferred' }))));
        permissions.clear();
        expect(state.columns(rows).some(column => column.key.startsWith('health.'))).toBe(false);
        expect(state.value(rows[0]!, 'health.medicalConditions')).toBe('profile.restricted');
    });
    test('annual requests use the selected year and retain false and zero distinctly from missing', async () => {
        permissions.add('STUDENT_READ');
        data.studentAcademicYearProfiles = [{ studentId: 'allowed', isRepeating: false }];
        const student = new DirectoryColumnsState('student'); student.keys = ['isRepeating'];
        await student.load(rows);
        expect(calls[0]?.query.academicYearId).toBe('year-1');
        const beforeSave = student.identity(rows); versions.students++;
        expect(student.identity(rows)).not.toBe(beforeSave);
        expect(student.value(rows[0]!, 'isRepeating')).toBe('common.no');
        expect(student.value(rows[2]!, 'isRepeating')).toBe('profile.notProvided');
        data.teacherAcademicYearProfiles = [{ teacherId: 'allowed', disciplineIds: [], declaredHours: 0, hoursPeriod: 'week' }];
        const teacher = new DirectoryColumnsState('teacher'); teacher.keys = ['declaredHours']; await teacher.load(rows);
        expect(teacher.value(rows[0]!, 'declaredHours')).toBe('0');
        academic.yearId = 'year-2';
        expect(teacher.value(rows[0]!, 'declaredHours')).toBe('profile.notProvided');
    });
    test('late data and exports cannot cross a user, school, year or grant change', async () => {
        permissions.add('STUDENT_HEALTH_READ');
        data.studentHealthProfiles = [{ studentId: 'allowed', medicalConditions: 'Private synthetic text' }];
        let release!: () => void; waitForRead = new Promise<void>(done => { release = done; });
        const state = new DirectoryColumnsState('student'); state.keys = ['health.medicalConditions'];
        const loading = state.load(rows); session.schoolId = 'another-school'; release(); await loading;
        expect(state.value(rows[0]!, 'health.medicalConditions')).toBe('profile.notProvided');
        waitForRead = new Promise<void>(done => { release = done; });
        const exporting = state.exportCsv('people.csv', rows, state.columns(rows));
        session.grants = ['revoked']; release(); await exporting;
        expect(downloads).toHaveLength(0);
    });
    test('guardian relationship summaries keep differing rights attached to each child', () => {
        const state = new DirectoryColumnsState('guardian');
        const row = { id: 'guardian', studentNames: { a: 'Aminata', b: 'Issa' }, links: [
            { studentId: 'a', relationship: 'mother', legalGuardian: true, canPickup: false },
            { studentId: 'b', relationship: 'aunt', legalGuardian: false, canPickup: true },
        ] };
        const summary = state.value(row, 'relationshipSummary');
        expect(summary).toContain('Aminata: mother');
        expect(summary).toContain('Issa: aunt');
        expect(summary).toContain('profile.legalGuardian: common.yes');
        expect(summary).toContain('profile.legalGuardian: common.no');
    });
    test('CSV keeps selected authorized header/cell order and one row per person', async () => {
        const state = new DirectoryColumnsState('student'); state.keys = ['firstName', 'obsolete', 'health.medicalConditions'];
        const columns = [{ key: 'name', label: 'Name', span: 3 }, ...state.columns(rows), { key: 'actions', label: '', span: 1 }];
        await state.exportCsv('people.csv', rows, columns);
        expect(downloads[0]?.[0]).toEqual(['Name', 'common.firstName']);
        expect(downloads[0]).toHaveLength(rows.length + 1);
        expect(downloads[0]?.slice(1).map(row => row.length)).toEqual([2, 2, 2]);
        expect(downloads[0]?.[1]?.[1]).toBe('Aminata');
    });
});

import type { StaffPermissionFormData } from '$lib/api/staff-permission-profiles-data';
import { readFile } from 'node:fs/promises';
import { plugin } from 'bun';
import { describe, expect, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'permission-form-runes', setup(builder) {
	builder.onLoad({ filter: /(?:(?:permission-impact-preview|staff-permission-form-data)-state|permission-preview-probe)\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await readFile(path, 'utf8')), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
const { PermissionImpactPreviewState } = await import('../../src/lib/school/permission-impact-preview-state.svelte');
const { StaffPermissionFormDataState } = await import('../../src/lib/school/staff-permission-form-data-state.svelte');
const { PermissionPreviewProbe } = await import('../support/permission-preview-probe.svelte');
const report = { changes: [], warnings: [] };
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
	return { promise, resolve, reject };
}
describe('permission form state ownership', () => {
	test('the derived Save gate updates after the first review and resets on close', async () => {
		const form = new PermissionPreviewProbe();
		expect(form.reviewed).toBe(false);
		await form.preview.review(form.input, async () => ({ resolution: report }), () => form.input, () => true);
		expect(form.reviewed).toBe(true);
		form.preview.synchronize(false, form.input);
		expect(form.reviewed).toBe(false);
	});
	for (const form of ['profile editing', 'profile assignment', 'manual assignment', 'default scopes']) {
		for (const changed of ['schoolId', 'staffId', 'academicYearId', 'profileId', 'permission', 'customScopes', 'useDefaultScopes', 'startsAt', 'endsAt', 'status']) {
			test(`${form} discards delayed review after ${changed} changes`, async () => {
				const state = new PermissionImpactPreviewState();
				let input: Record<string, unknown> = { schoolId: 'school', staffId: 'staff', academicYearId: 'year', profileId: 'profile', permission: 'GRADE_MANAGE', customScopes: [{ kind: 'school' }], useDefaultScopes: true, startsAt: '2026-01-01', endsAt: '2026-12-31', status: 'active' };
				const delayed = deferred<{ resolution: typeof report }>();
				const pending = state.review(input, () => delayed.promise, () => input, () => true);
				input = { ...input, [changed]: 'replacement' };
				state.synchronize(true, input);
				delayed.resolve({ resolution: report }); await pending;
				expect(state.reviewed(input)).toBe(false); expect(state.report).toBeNull(); expect(state.loading).toBe(false);
			});
		}
	}
	for (const form of ['profile editing', 'profile assignment', 'manual assignment', 'default scopes']) {
		test(`${form} rejects a pending response after close/reopen`, async () => {
			const state = new PermissionImpactPreviewState(); const input = { staffId: 'staff', year: 'year' };
			let active = true; const delayed = deferred<{ resolution: typeof report }>();
			const pending = state.review(input, () => delayed.promise, () => input, () => active);
			active = false; state.synchronize(active, input);
			active = true; state.synchronize(active, input);
			delayed.resolve({ resolution: report }); await pending;
			expect(state.report).toBeNull(); expect(state.reviewed(input)).toBe(false);
		});
	}
	test('captures immutable nested payloads and prevents late responses from overwriting a newer session', async () => {
		const state = new PermissionImpactPreviewState();
		const input = { scopes: [{ kind: 'school' }] };
		const old = deferred<{ resolution: typeof report }>();
		let snapshot: typeof input | undefined;
		const first = state.review(input, (command) => { snapshot = command; return old.promise; }, () => input, () => true);
		input.scopes[0]!.kind = 'student'; expect(snapshot?.scopes[0]?.kind).toBe('school');
		state.reset(); state.synchronize(true, input);
		const fresh = deferred<{ resolution: typeof report }>();
		const second = state.review(input, () => fresh.promise, () => input, () => true);
		old.resolve({ resolution: report }); await first;
		expect(state.loading).toBe(true); expect(state.report).toBeNull();
		fresh.resolve({ resolution: report }); await second; expect(state.reviewed(input)).toBe(true);
		state.synchronize(false, input); expect(state.reviewed(input)).toBe(false);
		state.synchronize(true, input); expect(state.reviewed(input)).toBe(false);
	});
	test('failed review never enables Save', async () => {
		const state = new PermissionImpactPreviewState(); const input = { staffId: 'staff' };
		await state.review(input, async () => null, () => input, () => true);
		expect(state.reviewed(input)).toBe(false); expect(state.loading).toBe(false);
	});
	test('form data owns failure/retry and ignores obsolete school or closed sessions', async () => {
		const requests: ReturnType<typeof deferred<StaffPermissionFormData>>[] = [];
		const state = new StaffPermissionFormDataState(() => { const next = deferred<StaffPermissionFormData>(); requests.push(next); return next.promise; });
		const first = state.load('old'); const second = state.load('current');
		requests[0]!.resolve({ profiles: [], catalog: [] }); await first; expect(state.data).toBeNull(); expect(state.loading).toBe(true);
		requests[1]!.reject(new Error('offline')); await second; expect(state.error).toBe(true); expect(state.loading).toBe(false);
		const retry = state.load('current'); requests[2]!.resolve({ profiles: [], catalog: [] }); await retry;
		expect(state.data).toEqual({ profiles: [], catalog: [] }); expect(state.error).toBe(false);
		const closed = state.load('current'); state.reset(); requests[3]!.resolve({ profiles: [], catalog: [] }); await closed;
		expect(state.data).toBeNull(); expect(state.loading).toBe(false);
	});
});

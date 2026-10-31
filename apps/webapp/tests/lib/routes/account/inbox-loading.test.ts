import type { InboxPageState } from '../../../../src/routes/(app)/account/inbox/inbox-page.svelte';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as schoolClient from '$lib/api/school-client';
import { ApiError } from '@maya-invest/edaya-api-client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { compileModule } from 'svelte/compiler';

let authSession: (typeof import('$lib/auth/session.svelte'))['authSession'];
let previousProfile: Pick<typeof authSession, 'subjectId' | 'userId' | 'sessionKind'>;
beforeEach(() => {
	previousProfile = { subjectId: authSession.subjectId, userId: authSession.userId, sessionKind: authSession.sessionKind };
});
afterEach(() => {
	Object.assign(authSession, previousProfile);
});
const sourcePath = resolve('src/routes/(app)/account/inbox/inbox-page.svelte.ts');
const compiledPath = resolve(`.svelte-kit/inbox-state-test-${process.pid}.mjs`);
let State: typeof InboxPageState;
beforeAll(async () => {
	authSession = (await import('$lib/auth/session.svelte')).authSession;
	const source = new Bun.Transpiler({ loader: 'ts' }).transformSync((await Bun.file(sourcePath).text()).replaceAll('\'./lib/', `'${resolve('src/routes/(app)/account/inbox/lib')}/`));
	await Bun.write(compiledPath, compileModule(source, { filename: sourcePath, generate: 'server' }).js.code);
	State = (await import(compiledPath)).InboxPageState;
});
afterAll(async () => {
	await unlink(compiledPath);
});
const delivery = (index: number) => ({ id: `delivery-${index}`, subjectId: 'login', recipientKind: 'staff', recipientId: 'staff', title: 'Notice', body: 'Saved message', status: 'sent', sentAt: '2026-10-27T12:00:00Z' });
const batch = (offset: number, total = 53) => Array.from({ length: Math.min(25, total - offset) }, (_, index) => delivery(offset + index));
function profile() {
	authSession.subjectId = 'login';
	authSession.userId = 'staff';
	authSession.sessionKind = 'staff';
}
function clientFor(deliveries: object) {
	return spyOn(schoolClient, 'getBrowserSchoolClient').mockReturnValue({ entities: { messageDeliveries: deliveries } } as unknown as ReturnType<typeof schoolClient.getBrowserSchoolClient>);
}

describe('personal inbox selection and paging', () => {
	it('retains appended results and pagination while opening and closing inspection', async () => {
		profile();
		const list = mock(async (input: { $offset: number }) => batch(input.$offset));
		const count = mock(async () => ({ count: 53 }));
		const get = mock(async () => delivery(99));
		const spy = clientFor({ list, count, get });
		let url = new URL('http://local/account/inbox?status=unread');
		try {
			const state = new State(() => url);
			await state.queryListPage()(url);
			expect(state.total).toBe(53);
			await state.loadMore();
			expect(state.deliveries).toHaveLength(50);
			url = new URL('http://local/account/inbox/delivery-40?status=unread');
			await state.queryListPage()(url);
			expect(state.selected?.id).toBe('delivery-40');
			expect(state.deliveries).toHaveLength(50);
			expect(list).toHaveBeenCalledTimes(2);
			expect(count).toHaveBeenCalledTimes(1);
			expect(get).not.toHaveBeenCalled();
			url = new URL('http://local/account/inbox?status=unread');
			await state.queryListPage()(url);
			expect(state.selected).toBeUndefined();
			await state.loadMore();
			expect(state.deliveries).toHaveLength(53);
			expect(state.hasMore).toBe(false);
			expect(list.mock.calls.map(([input]) => input.$offset)).toEqual([0, 25, 50]);
		}
		finally { spy.mockRestore(); }
	});
	it('loads direct links independently of the matching page and rejects another recipient profile', async () => {
		profile();
		const list = mock(async () => []);
		const count = mock(async () => ({ count: 0 }));
		let selected = delivery(99);
		const get = mock(async () => selected);
		const spy = clientFor({ list, count, get });
		const url = new URL('http://local/account/inbox/delivery-99?search=unmatched');
		try {
			const state = new State(() => url);
			await state.queryListPage()(url);
			expect(state.selected?.id).toBe('delivery-99');
			expect(state.total).toBe(0);
			selected = { ...selected, recipientId: 'other-profile' };
			await expect(state.loadSlice(url)).rejects.toBeInstanceOf(ApiError);
			authSession.userId = 'other-profile';
			expect(state.selected).toBeUndefined();
			expect(state.deliveries).toEqual([]);
		}
		finally { spy.mockRestore(); }
	});
	it('drops stale results when the selected profile changes during a request', async () => {
		profile();
		let finish!: (rows: ReturnType<typeof batch>) => void;
		let started!: () => void;
		const ready = new Promise<void>((resolve) => {
			started = resolve;
		});
		const list = mock(async () => new Promise<ReturnType<typeof batch>>((resolve) => {
			finish = resolve;
			started();
		}));
		const spy = clientFor({ list, count: async () => ({ count: 53 }) });
		const url = new URL('http://local/account/inbox');
		try {
			const state = new State(() => url);
			const pending = state.queryListPage()(url);
			await ready;
			authSession.userId = 'new-profile';
			finish(batch(0));
			await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
			expect(state.slice).toBeNull();
			expect(state.deliveries).toEqual([]);
		}
		finally { spy.mockRestore(); }
	});
});

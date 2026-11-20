import { readFile } from 'node:fs/promises';
import { plugin } from 'bun';
import { afterEach, describe, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'messaging-runes', setup(builder) {
	builder.onLoad({ filter: /(?:messages-page|message-count)\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await readFile(path, 'utf8')), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
let canReadMessages = true;
let canReviewMessages = false;
const session = { ready: true, isLoggedIn: true, subjectId: 'login', schoolId: 'school', sessionKind: 'staff', userId: 'secretary' };
let replyError: Error | null = null;
let version = 1;
let allowed = true;
let olderPage = false;
let unread = true;
let failReceipt = false;
let sequence = 1;
const sent: Record<string, unknown>[] = [];
const detail = () => ({ conversation: { id: 'thread', version, unread, allowedActions: { reply: allowed, resolve: allowed } }, messages: [{ id: 'one', sequence, body: 'Opening hours?' }], hasMore: false });
interface ListRow { id: string }
interface ListResponse { items: ListRow[]; total: number; unreadCount: number }
interface ListRequest { search?: string; destination?: string; status?: string; order: string; offset: number; limit: number }
let listHandler = async (_input: ListRequest): Promise<ListResponse> => ({ items: [], total: 0, unreadCount: 1 });
const listCalls: ListRequest[] = [];
const readBadge = mock(async () => ({ count: 0 }));
const client = { queries: {
	getUnresolvedConversationCount: readBadge,
	listConversations: async (input: ListRequest) => { listCalls.push(input); return listHandler(input); },
	getConversation: async (input: { beforeSequence?: number }) => olderPage
		? { ...detail(), messages: [{ id: String(input.beforeSequence ? 1 : 2), sequence: input.beforeSequence ? 1 : 2, body: 'History' }], hasMore: !input.beforeSequence }
		: detail(),
}, commands: {
	markConversationRead: async (input: Record<string, unknown>) => {
        sent.push(input);
        if (failReceipt) throw new Error('Receipt unavailable');
        unread = false;
    },
	replyConversation: async (input: Record<string, unknown>) => {
		sent.push(input); if (replyError)
			throw replyError; version++; return detail().conversation;
	},
	resolveConversation: async () => { version++; return detail().conversation; },
} };
mock.module('$lib/auth/session.svelte', () => ({ authSession: session }));
mock.module('$lib/api/school-client', () => ({ getBrowserSchoolClient: () => client }));
mock.module('$lib/permissions', () => ({ hasPermission: (permission: string) => permission === 'SCHOOL_MESSAGES_READ' ? canReadMessages : canReviewMessages }));
mock.module('$lib/i18n', () => ({ t: { subscribe: (fn: (value: unknown) => void) => { fn((key: string) => key); return () => {}; } } }));
mock.module('$lib/queries/page-status', () => ({ resolvePageLoad: (_: unknown, spec: { load: () => unknown }) => spec.load() }));
mock.module('$lib/api/mutations/run-mutation', () => ({ runMutation: async (fn: () => Promise<unknown>, options: { onSuccess: () => Promise<void> }) => {
	try { const result = await fn(); await options.onSuccess(); return result; }
	catch { return null; }
} }));
const { ApiError } = await import('@maya-invest/edaya-api-client');
const { MessagesPageState } = await import('../../src/routes/(app)/school/messages/messages-page.svelte');
afterEach(() => { canReadMessages = true; canReviewMessages = false; replyError = null; version = 1; allowed = true; olderPage = false; unread = true; sequence = 1; failReceipt = false; sent.length = 0; session.schoolId = 'school'; listCalls.length = 0; listHandler = async () => ({ items: [], total: 0, unreadCount: 1 }); });
describe('staff messaging integration state', () => {
    test('the receipt clears only the visible row covered by the displayed message', async () => {
        const state = new MessagesPageState(() => new URL('http://local/school/messages/thread'));
        listHandler = async () => ({ items: [{ id: 'thread', lastSequence: 2, unread: true }], total: 1, unreadCount: 1 });
        await state.load();
        expect(state.items[0].unread).toBe(true);
        expect(state.unreadCount).toBe(1);
        sequence = 2;
        await state.refresh();
        expect(state.items[0].unread).toBe(false);
        expect(state.unreadCount).toBe(0);
        unread = true;
        listHandler = async () => ({ items: [{ id: 'another', lastSequence: 2, unread: true }], total: 1, unreadCount: 1 });
        await state.refresh();
        expect(state.unreadCount).toBe(1);
        unread = true;
        listHandler = async ({ limit }) => ({ items: Array.from({ length: limit }, (_, i) => ({ id: String(i) })), total: 75, unreadCount: unread ? 5 : 4 });
        await state.refresh();
        expect(listCalls.at(-1)?.limit).toBe(1);
        expect(state.unreadCount).toBe(4);
    });
    test('read receipt writes follow the authorized unread state through polling and retry', async () => {
        const state = new MessagesPageState(() => new URL('http://local/school/messages/thread'));
        await state.load();
        for (let poll = 0; poll < 5; poll++) await state.refresh();
        const afterIdle = sent.length;
        sequence = 2; // Another device has already read this message.
        await state.refresh();
        const afterOtherDevice = sent.length;
        sequence = 3;
        unread = true;
        failReceipt = true;
        await state.refresh();
        expect(state.error).toBeTruthy();
        failReceipt = false;
        await state.refresh();
        await state.refresh();
        expect(state.error).toBe('');
        expect({ afterIdle, afterOtherDevice, sequences: sent.map(input => input.throughSequence) })
            .toEqual({ afterIdle: 1, afterOtherDevice: 1, sequences: [1, 3, 3] });
    });
	test('concurrent staff activity retains the draft and requires review before resubmission', async () => {
		const state = new MessagesPageState(() => new URL('http://local/school/messages/thread'));
		await state.load(); state.beginReply(); state.draft = 'The office opens at eight.';
		version = 2;
		// Polling must not silently replace the version the author reviewed.
		await state.load();
		replyError = new ApiError(409, { code: 'CONVERSATION_CHANGED' });
		expect(await state.mutate('reply')).toBe(false);
		expect(sent.find(input => 'body' in input)?.expectedVersion).toBe(1);
		expect(state.draft).toBe('The office opens at eight.');
		expect(state.needsReview).toBe(true);
		replyError = null;
		expect(await state.mutate('reply')).toBe(false);
		state.beginReply(); expect(await state.mutate('reply')).toBe(true);
		expect(state.draft).toBe('');
	});
	test('a lost acknowledgement retries with the original request identifier', async () => {
		const state = new MessagesPageState(() => new URL('http://local/school/messages/thread'));
		await state.load(); state.beginReply(); state.draft = 'Hello';
		replyError = new ApiError(503, {}); await state.mutate('reply');
		replyError = null; await state.mutate('reply');
		const replies = sent.filter(input => 'body' in input);
		expect(replies).toHaveLength(2); expect(replies[0].requestId).toBe(replies[1].requestId);
	});
	test('polling preserves previously loaded history and the oldest-page boundary', async () => {
		olderPage = true;
		const state = new MessagesPageState(() => new URL('http://local/school/messages/thread'));
		await state.load(); await state.older();
		expect(state.detail?.messages.map(message => message.sequence)).toEqual([1, 2]);
		await state.refresh();
		expect(state.detail?.messages.map(message => message.sequence)).toEqual([1, 2]);
		expect(state.detail?.hasMore).toBe(false);
	});
	test('switching profiles clears the content and addressed draft', async () => {
		const state = new MessagesPageState(() => new URL('http://local/school/messages/thread'));
		await state.load(); state.draft = 'Private draft'; session.schoolId = 'other';
		await state.load(); expect(state.draft).toBe('');
	});
});

function pagedRoster(total: number) {
	listHandler = async ({ offset, limit }) => ({ items: Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => ({ id: String(offset + i) })), total, unreadCount: 0 });
}
function deferredPage<T = ListResponse>() {
	let resolve!: (page: T) => void;
	const promise = new Promise<T>((done) => { resolve = done; });
	return { promise, resolve };
}
describe('conversation infinite loading', () => {
    test('refreshes the whole retained window within the API page limit and removes revoked rows', async () => {
        pagedRoster(130);
        const state = new MessagesPageState(() => new URL('http://local/school/messages'));
        await state.load();
        for (let page = 1; page < 5; page++) await state.loadMore();
        expect(state.items).toHaveLength(125);
        listCalls.length = 0;
        listHandler = async ({ offset, limit }) => {
            const items = Array.from({ length: 130 }, (_, index) => ({ id: String(index) })).filter(row => row.id !== '67');
            return { items: items.slice(offset, offset + limit), total: items.length, unreadCount: 0 };
        };
        await state.refresh();
        expect(state.items).toHaveLength(125);
        expect(state.items.some(row => row.id === '67')).toBe(false);
        expect(state.items.at(-1)?.id).toBe('125');
        expect(listCalls.map(({ offset, limit }) => [offset, limit])).toEqual([[0, 100], [100, 25]]);
    });
	for (const view of ['', '?type=school', '?type=teacher', '?view=teacher']) {
		test(`appends all batches and preserves them across refresh and selection ${view}`, async () => {
			pagedRoster(61);
			let url = new URL(`http://local/school/messages${view}`);
			const state = new MessagesPageState(() => url);
			await state.load();
			expect(state.items).toHaveLength(25);
			await state.loadMore();
			expect(state.items).toHaveLength(50);
			await state.refresh();
			expect(state.items).toHaveLength(50);
			url = new URL(url); url.pathname += '/thread';
			await state.load();
			expect(state.items).toHaveLength(50);
			url = new URL(url); url.pathname = '/school/messages';
			await state.load();
			expect(state.items).toHaveLength(50);
			await state.loadMore();
			expect(state.items).toHaveLength(61);
			expect(state.hasMore).toBe(false);
			expect(listCalls.map(call => call.limit)).toEqual([25, 25, 50, 50, 50, 25]);
			expect(listCalls.every(call => call.destination === (view.includes('teacher') ? 'teacher' : view.includes('school') ? 'school' : undefined))).toBe(true);
		});
	}
	test('shows both types together by default and narrows only when a type filter is selected', async () => {
		const rows = [{ id: 'school-thread', destination: 'school' }, { id: 'teacher-thread', destination: 'teacher' }];
		listHandler = async ({ destination }) => {
			const items = rows.filter(row => !destination || row.destination === destination);
			return { items, total: items.length, unreadCount: 0 };
		};
		let url = new URL('http://local/school/messages');
		const state = new MessagesPageState(() => url);
		await state.load();
		expect(state.destination).toBe('all');
		expect(state.items.map(row => row.id)).toEqual(['school-thread', 'teacher-thread']);
		url = new URL('http://local/school/messages?type=teacher&status=awaiting_guardian');
		await state.load();
		expect(state.items.map(row => row.id)).toEqual(['teacher-thread']);
		expect(listCalls.at(-1)?.status).toBe('awaiting_guardian');
		url = new URL('http://local/school/messages');
		await state.load();
		expect(state.items).toHaveLength(2);
		expect(state.total).toBe(2);
	});
 test('sends search with facets to every page and resets matching state when search changes', async () => {
  pagedRoster(60);
  let url = new URL('http://local/school/messages?search=office&type=school&status=awaiting_school');
  const state = new MessagesPageState(() => url);
  await state.load();
  await state.loadMore();
  expect(listCalls.map(call => call.search)).toEqual(['office', 'office']);
  expect(listCalls.at(-1)).toMatchObject({ destination: 'school', status: 'awaiting_school', search: 'office', offset: 25 });
  url = new URL('http://local/school/messages?search=homework&type=school&status=awaiting_school');
  await state.load();
  expect(listCalls.at(-1)).toMatchObject({ search: 'homework', offset: 0 });
  expect(state.items).toHaveLength(25);
 });

	test('stops refreshing further batches after the account changes', async () => {
		pagedRoster(60);
		const state = new MessagesPageState(() => new URL('http://local/school/messages'));
		await state.load();
		await state.loadMore();
		const pending = deferredPage();
		listHandler = () => pending.promise;
		const refreshing = state.refresh();
		session.schoolId = 'other';
		pending.resolve({ items: Array.from({ length: 25 }, (_, i) => ({ id: `stale-${i}` })), total: 60, unreadCount: 0 });
		await refreshing;
		expect(listCalls).toHaveLength(3);
		expect(state.items.some(row => row.id.startsWith('stale'))).toBe(false);
		expect(state.error).toBe('');
	});
	test('deduplicates overlapping batches and stops on an empty response', async () => {
		pagedRoster(100);
		const state = new MessagesPageState(() => new URL('http://local/school/messages'));
		await state.load();
		listHandler = async () => ({ items: [{ id: '24' }, { id: '25' }], total: 100, unreadCount: 0 });
		await state.loadMore();
		expect(state.items).toHaveLength(26);
		listHandler = async () => ({ items: [], total: 100, unreadCount: 0 });
		await state.loadMore();
		expect(listCalls.at(-1)?.offset).toBe(27);
		expect(state.hasMore).toBe(false);
	});
	test('retains rows after failure and retries the same batch explicitly', async () => {
		pagedRoster(40);
		const state = new MessagesPageState(() => new URL('http://local/school/messages'));
		await state.load();
		listHandler = async () => { throw new Error('offline'); };
		await state.loadMore();
		expect(state.items).toHaveLength(25);
		expect(state.loadMoreError).toBe(true);
		expect(state.hasMore).toBe(false);
		await state.loadMore();
		expect(listCalls).toHaveLength(2);
		pagedRoster(40);
		await state.retryLoadMore();
		expect(listCalls.at(-1)?.offset).toBe(25);
		expect(state.items).toHaveLength(40);
		expect(state.loadMoreError).toBe(false);
	});
	for (const change of ['search', 'status', 'order', 'type', 'view', 'identity', 'clear']) {
		test(`discards pending batches after ${change} changes`, async () => {
			pagedRoster(60);
			let url = new URL('http://local/school/messages?offset=25');
			const state = new MessagesPageState(() => url);
			await state.load();
			expect(listCalls[0].offset).toBe(0);
			const pending = deferredPage();
			listHandler = () => pending.promise;
			const loading = state.loadMore();
			await state.loadMore();
			await state.refresh();
			expect(listCalls).toHaveLength(2);
			if (change === 'clear') {
				state.clear();
			}
			else {
				if (change === 'identity') {
					session.schoolId = 'other';
				}
				else { url = new URL(url); url.searchParams.set(change, change === 'status' ? 'resolved' : change === 'order' ? 'oldest_awaiting' : 'teacher'); }
				pagedRoster(30);
				await state.load();
				expect(state.items).toHaveLength(25);
			}
			pending.resolve({ items: [{ id: 'stale' }], total: 60, unreadCount: 0 });
			await loading;
			expect(state.items.some(row => row.id === 'stale')).toBe(false);
			expect(state.loadingMore).toBe(false);
		});
	}
});

const { MessageCountState } = await import('../../src/lib/shell/message-count.svelte');
describe('unresolved messages sidebar badge', () => {
	afterEach(() => readBadge.mockClear());
	test('uses a single authorized aggregate without fetching message lists', async () => {
		readBadge.mockResolvedValueOnce({ count: 59 });
		const count = new MessageCountState();
		expect(count.count).toBeNull();
		await count.refresh();
		expect(count.count).toBe(59);
		expect(readBadge).toHaveBeenCalledTimes(1);
		expect(listCalls).toHaveLength(0);
		readBadge.mockResolvedValueOnce({ count: 0 });
		await count.refresh();
		expect(count.count).toBe(0);
	});
	test('does not request counts without either conversation permission', async () => {
		canReadMessages = false;
		const count = new MessageCountState();
		await count.refresh();
		expect(count.count).toBeNull();
		expect(readBadge).not.toHaveBeenCalled();
		expect(listCalls).toHaveLength(0);
	});
	test('includes the authorized count for staff who can only review teacher conversations', async () => {
		canReadMessages = false;
		canReviewMessages = true;
		readBadge.mockResolvedValueOnce({ count: 8 });
		const count = new MessageCountState();
		await count.refresh();
		expect(count.count).toBe(8);
		expect(readBadge).toHaveBeenCalledTimes(1);
		expect(listCalls).toHaveLength(0);
	});
	test('hides counts after access changes and discards responses from the previous account', async () => {
		const count = new MessageCountState();
		const pending = deferredPage<{ count: number }>();
		readBadge.mockImplementationOnce(() => pending.promise);
		const refreshing = count.refresh();
		session.schoolId = 'other';
		pending.resolve({ count: 7 });
		await refreshing;
		expect(count.count).toBeNull();
		readBadge.mockResolvedValueOnce({ count: 6 });
		await count.refresh();
		expect(count.count).toBe(6);
		canReadMessages = false;
		expect(count.count).toBeNull();
	});
	test('does not show a misleading zero or stale count after a failed request', async () => {
		const count = new MessageCountState();
		readBadge.mockResolvedValueOnce({ count: 3 });
		await count.refresh();
		expect(count.count).toBe(3);
		readBadge.mockRejectedValueOnce(new Error('offline'));
		await count.refresh();
		expect(count.count).toBeNull();
	});
});

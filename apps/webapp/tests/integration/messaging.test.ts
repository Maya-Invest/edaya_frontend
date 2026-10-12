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
const sent: Record<string, unknown>[] = [];
const detail = () => ({ conversation: { id: 'thread', version, unread: true, allowedActions: { reply: allowed, resolve: allowed } }, messages: [{ id: 'one', sequence: 1, body: 'Opening hours?' }], hasMore: false });
interface ListRow { id: string }
interface ListResponse { items: ListRow[]; total: number; unreadCount: number }
interface ListRequest { destination?: string; status?: string; order: string; offset: number; limit: number }
let listHandler = async (_input: ListRequest): Promise<ListResponse> => ({ items: [], total: 0, unreadCount: 1 });
const listCalls: ListRequest[] = [];
const client = { queries: {
	listConversations: async (input: ListRequest) => { listCalls.push(input); return listHandler(input); },
	getConversation: async (input: { beforeSequence?: number }) => olderPage
		? { ...detail(), messages: [{ id: String(input.beforeSequence ? 1 : 2), sequence: input.beforeSequence ? 1 : 2, body: 'History' }], hasMore: !input.beforeSequence }
		: detail(),
}, commands: {
	markConversationRead: async (input: Record<string, unknown>) => { sent.push(input); },
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
afterEach(() => { canReadMessages = true; canReviewMessages = false; replyError = null; version = 1; allowed = true; olderPage = false; sent.length = 0; session.schoolId = 'school'; listCalls.length = 0; listHandler = async () => ({ items: [], total: 0, unreadCount: 1 }); });
describe('staff messaging integration state', () => {
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
function deferredPage() {
	let resolve!: (page: ListResponse) => void;
	const promise = new Promise<ListResponse>((done) => { resolve = done; });
	return { promise, resolve };
}
describe('conversation infinite loading', () => {
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
			expect(listCalls.every(call => call.limit === 25 && call.destination === (view.includes('teacher') ? 'teacher' : view.includes('school') ? 'school' : undefined))).toBe(true);
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
	for (const change of ['status', 'order', 'type', 'view', 'identity', 'clear']) {
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
	test('counts both unresolved statuses using totals instead of loaded rows', async () => {
		listHandler = async input => ({ items: [{ id: 'only-one-loaded' }], total: input.status === 'awaiting_school' ? 42 : 17, unreadCount: 99 });
		const count = new MessageCountState();
		expect(count.count).toBeNull();
		await count.refresh();
		expect(count.count).toBe(59);
		expect(listCalls.map(({ destination, status, limit, offset }) => ({ destination, status, limit, offset }))).toEqual([
			{ destination: undefined, status: 'awaiting_school', limit: 1, offset: 0 },
			{ destination: undefined, status: 'awaiting_guardian', limit: 1, offset: 0 },
		]);
		listHandler = async () => ({ items: [], total: 0, unreadCount: 0 });
		await count.refresh();
		expect(count.count).toBe(0);
	});
	test('does not request counts without either conversation permission', async () => {
		canReadMessages = false;
		const count = new MessageCountState();
		await count.refresh();
		expect(count.count).toBeNull();
		expect(listCalls).toHaveLength(0);
	});
	test('includes the authorized count for staff who can only review teacher conversations', async () => {
		canReadMessages = false;
		canReviewMessages = true;
		listHandler = async () => ({ items: [], total: 4, unreadCount: 0 });
		const count = new MessageCountState();
		await count.refresh();
		expect(count.count).toBe(8);
		expect(listCalls.every(call => call.destination === undefined)).toBe(true);
	});
	test('hides counts after access changes and discards responses from the previous account', async () => {
		const count = new MessageCountState();
		const pending = deferredPage();
		listHandler = () => pending.promise;
		const refreshing = count.refresh();
		session.schoolId = 'other';
		pending.resolve({ items: [], total: 7, unreadCount: 0 });
		await refreshing;
		expect(count.count).toBeNull();
		listHandler = async () => ({ items: [], total: 3, unreadCount: 0 });
		await count.refresh();
		expect(count.count).toBe(6);
		canReadMessages = false;
		expect(count.count).toBeNull();
	});
	test('does not show a misleading zero or stale count after a failed request', async () => {
		const count = new MessageCountState();
		listHandler = async () => ({ items: [], total: 3, unreadCount: 0 });
		await count.refresh();
		listHandler = async () => { throw new Error('offline'); };
		await count.refresh();
		expect(count.count).toBeNull();
	});
});

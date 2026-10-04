import { readFile } from 'node:fs/promises';
import { plugin } from 'bun';
import { afterEach, describe, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'messaging-runes', setup(builder) {
	builder.onLoad({ filter: /messages-page\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await readFile(path, 'utf8')), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
const session = { subjectId: 'login', schoolId: 'school', sessionKind: 'staff', userId: 'secretary' };
let replyError: Error | null = null;
let version = 1;
let allowed = true;
let olderPage = false;
const sent: Record<string, unknown>[] = [];
const detail = () => ({ conversation: { id: 'thread', version, unread: true, allowedActions: { reply: allowed, resolve: allowed } }, messages: [{ id: 'one', sequence: 1, body: 'Opening hours?' }], hasMore: false });
const client = { queries: {
	listConversations: async () => ({ items: [], total: 0, unreadCount: 1 }),
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
mock.module('$lib/permissions', () => ({ hasPermission: () => true }));
mock.module('$lib/i18n', () => ({ t: { subscribe: (fn: (value: unknown) => void) => { fn((key: string) => key); return () => {}; } } }));
mock.module('$lib/queries/page-status', () => ({ resolvePageLoad: (_: unknown, spec: { load: () => unknown }) => spec.load() }));
mock.module('$lib/api/mutations/run-mutation', () => ({ runMutation: async (fn: () => Promise<unknown>, options: { onSuccess: () => Promise<void> }) => {
	try { const result = await fn(); await options.onSuccess(); return result; }
	catch { return null; }
} }));
const { ApiError } = await import('@maya-invest/edaya-api-client');
const { MessagesPageState } = await import('../../src/routes/(app)/school/messages/messages-page.svelte');
afterEach(() => { replyError = null; version = 1; allowed = true; olderPage = false; sent.length = 0; session.schoolId = 'school'; });
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

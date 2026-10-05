import { readFile } from 'node:fs/promises';
import { plugin } from 'bun';
import { afterEach, describe, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'account-linking-runes', setup(builder) {
	builder.onLoad({ filter: /account-linking-state\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await readFile(path, 'utf8')), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => { resolve = done; });
	return { promise, resolve };
}
let load = async (_kind: string, _id: string): Promise<{ id: string } | null> => null;
let mutation = async (): Promise<{ invitationId: string; inviteUrl: string } | null> => ({ invitationId: 'invite', inviteUrl: 'http://local/invite' });
mock.module('$lib/api/invitation-cache', () => ({ readPendingInvitation: () => null }));
mock.module('$lib/api/invitation-data', () => ({ fetchPendingAccountInvitation: (kind: string, id: string) => load(kind, id) }));
mock.module('$lib/api/mutations/invitation.mutations', () => ({ sendAccountInvitationMutation: () => mutation(), resendAccountInvitationMutation: () => mutation(), revokeAccountInvitationMutation: async () => true }));
mock.module('$lib/i18n', () => ({ t: { subscribe: (fn: (value: unknown) => void) => { fn((key: string) => key); return () => {}; } } }));
const { AccountLinkingState } = await import('../../src/lib/smart-components/account-linking/account-linking-state.svelte');
const target = (id: string) => ({ kind: 'staff' as const, targetId: id, subjectId: null, contactEmail: '', displayName: id });
afterEach(() => {
	load = async () => null;
	mutation = async () => ({ invitationId: 'invite', inviteUrl: 'http://local/invite' });
});
describe('account invitation workflow ownership', () => {
	test('ignores an old actor response after navigation', async () => {
		let current = target('first'); const old = deferred<{ id: string } | null>();
		load = async (_, id) => id === 'first' ? old.promise : { id: 'second-invite' };
		const state = new AccountLinkingState(() => current);
		const first = state.loadPending(); state.cancelPending(); current = target('second'); await state.loadPending();
		old.resolve({ id: 'first-invite' }); await first;
		expect(state.pendingInvitationId).toBe('second-invite');
	});
	test('applies successful actions and preserves state after failed requests', async () => {
		const state = new AccountLinkingState(() => target('staff')); await state.loadPending();
		await state.send(); expect(state.linkStatus).toBe('pending'); expect(state.lastInviteUrl).toBe('http://local/invite');
		mutation = async () => null; await state.resend(); expect(state.pendingInvitationId).toBe('invite'); expect(state.busy).toBe(false);
		await state.revoke(); expect(state.linkStatus).toBe('not_linked'); expect(state.lastInviteUrl).toBeNull();
	});
	test('does not apply a successful write to a newly selected actor', async () => {
		let current = target('first'); const write = deferred<{ invitationId: string; inviteUrl: string } | null>(); mutation = () => write.promise;
		const state = new AccountLinkingState(() => current); await state.loadPending();
		const sending = state.send(); current = target('second'); state.cancelPending(); await state.loadPending();
		write.resolve({ invitationId: 'first-invite', inviteUrl: 'http://local/first' }); await sending;
		expect(state.pendingInvitationId).toBeNull(); expect(state.lastInviteUrl).toBeNull(); expect(state.busy).toBe(false);
	});
});

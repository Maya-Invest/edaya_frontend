import type { AccountIdentifier, AuthFailure, AuthSnapshot } from '$lib/auth/client';
import { readFile } from 'node:fs/promises';
import { plugin } from 'bun';
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'account-security-runes', setup(builder) {
 builder.onLoad({ filter: /account-security\/security-page\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await readFile(path, 'utf8')), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
const session = { authUserId: 'login' as string | null };
let identifiers: AccountIdentifier[];
let snapshot: { data: AuthSnapshot | null; error: AuthFailure | null };
let status: { data: { totpEnabled: boolean; totpRequired: boolean } | null; error: AuthFailure | null };
let unlinkResult: { data: object | null; error: AuthFailure | null };
let readSession: () => Promise<typeof snapshot>;
const calls: string[] = [];
const navigated: string[] = [];
mock.module('$lib/auth/session.svelte', () => ({ authSession: session }));
mock.module('$lib/auth/client', () => ({ authClient: {
 getSession: () => { calls.push('session'); return readSession(); },
 security: async () => { calls.push('security'); return status; },
 unlinkIdentifier: async () => { calls.push('unlink'); return unlinkResult; },
 signOut: async () => { calls.push('signout'); return unlinkResult; },
} }));
mock.module('$lib/i18n', () => ({ t: { subscribe(run: (translate: (key: string) => string) => void) { run(key => key); return () => {}; } } }));
const { SecurityPage } = await import('../../src/lib/smart-components/account-security/security-page.svelte');
beforeEach(() => {
 session.authUserId = 'login'; calls.length = 0; navigated.length = 0;
 identifiers = [{ id: 'primary', kind: 'email', value: 'person@example.test', recoveryEligible: true }, { id: 'backup', kind: 'email', value: 'backup@example.test', recoveryEligible: false }];
 snapshot = { data: { user: { id: 'login', accountId: 'login', email: 'person@example.test', phone: null, name: 'Person', emailVerified: true }, account: { id: 'login', identifiers }, session: { id: 'session', expiresAt: '', createdAt: '' } }, error: null };
 status = { data: { totpEnabled: false, totpRequired: false }, error: null };
 unlinkResult = { data: {}, error: null };
 readSession = async () => snapshot;
});
const create = () => new SecurityPage(href => navigated.push(href));
describe('account security summary and explicit actions', () => {
 test('reads summary without mutations or a school context', async () => {
  const state = create(); expect(await state.load()).toBe(true);
  expect(state.identifiers).toEqual(identifiers); expect(state.loaded).toBe(true);
  expect(state.action).toBeNull(); expect(state.needsAuthentication).toBe(false);
  expect(calls).toEqual(['session', 'security']);
 });
 test('distinguishes failed reads from a required identity challenge and supports retry', async () => {
  const state = create(); status = { data: null, error: { code: 'network_error', message: 'Offline' } };
  expect(await state.load()).toBe(false); expect(state.error).toBe('Offline'); expect(state.needsAuthentication).toBe(false);
  status = { data: null, error: { code: 'reauthentication_required', status: 401, message: 'Verify' } };
  await state.load(); expect(state.needsAuthentication).toBe(true);
  status = { data: { totpEnabled: true, totpRequired: false }, error: null };
  expect(await state.load()).toBe(true); expect(state.totpEnabled).toBe(true);
 });
 test('keeps the pending link draft through verification without replaying the command', async () => {
  const state = create(); await state.load(); state.begin('link'); state.linkEmail = 'new@example.test'; state.linkRecoveryEligible = true; state.requireAuthentication();
  await state.load(); expect(state.linkEmail).toBe('new@example.test'); expect(state.linkRecoveryEligible).toBe(true); expect(state.action).toBe('link'); expect(state.needsAuthentication).toBe(false);
  expect(calls.filter(call => call === 'unlink')).toHaveLength(0);
 });
 test('blocks unknown methods and removal of the last recovery method', async () => {
  const state = create(); await state.load();
  expect(state.canUnlink('primary')).toBe(false); expect(state.canUnlink('missing')).toBe(false); expect(state.canUnlink('backup')).toBe(true);
  expect(await state.unlink('primary')).toBe(false); expect(calls).not.toContain('unlink');
 });
 test('requires a new explicit removal after verification and redirects only after confirmed success', async () => {
  const state = create(); await state.load(); unlinkResult = { data: null, error: { code: 'reauthentication_required', status: 401, message: 'Verify' } };
  expect(await state.unlink('backup')).toBe(false); expect(state.needsAuthentication).toBe(true); expect(navigated).toEqual([]);
  await state.load(); expect(calls.filter(call => call === 'unlink')).toHaveLength(1);
  unlinkResult = { data: {}, error: null }; expect(await state.unlink('backup')).toBe(true); expect(navigated).toEqual(['/login']);
 });
 test('rejects responses after account changes or disposal', async () => {
  for (const change of ['account', 'dispose']) {
   let finish!: (value: typeof snapshot) => void;
   readSession = () => new Promise(resolve => { finish = resolve; });
   const state = create(); const pending = state.load();
   if (change === 'account') session.authUserId = 'next'; else state.dispose();
   finish(snapshot); expect(await pending).toBe(false); expect(state.identifiers).toEqual([]); expect(state.loaded).toBe(false);
   session.authUserId = 'login';
  }
 });
 test('does not reuse another signed-in account for a pending action', async () => {
  const state = create(); snapshot.data!.user.id = 'different'; await state.load();
  expect(state.accountChanged).toBe(true); expect(state.identifiers).toEqual([]); state.begin('link'); expect(state.action).toBeNull();
 });
 test('a saved action with a failed refresh stays completed', async () => {
  const state = create(); await state.load(); state.begin('link');
  status = { data: null, error: { code: 'network_error', message: 'Offline' } };
  await state.completeAction(); expect(state.action).toBeNull(); expect(state.error).toBe('mutation.savedRefreshFailed');
 });
});

import type { AuthFailure, AuthOutcome, PrimaryStatus } from '$lib/auth/client';
import { readFile } from 'node:fs/promises';
import { plugin } from 'bun';
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { compileModule } from 'svelte/compiler';

plugin({ name: 'passwordless-state-runes', setup(builder) {
	builder.onLoad({ filter: /(?:passwordless-panel|test-otp-panel)-state\.svelte\.ts$/ }, async ({ path }) => ({ contents: compileModule(new Bun.Transpiler({ loader: 'ts' }).transformSync(await readFile(path, 'utf8')), { filename: path, generate: 'client' }).js.code, loader: 'js' }));
} });
const calls: Array<{ method: string; args: unknown[] }> = [];
let outcome: { data: AuthOutcome | null; error: AuthFailure | null };
let peek: () => Promise<{ data: { challenge: string; otp: string; expiresAt: number } | null; error: null }>;
const methods = ['startOtp', 'linkIdentifier', 'enroll', 'verifyOtp', 'verifyTotp', 'recover', 'confirmEnrollment'];
mock.module('$lib/auth/client', () => ({ authClient: Object.fromEntries(methods.map(method => [method, async (...args: unknown[]) => { calls.push({ method, args }); return outcome; }])), authRequest: () => peek() }));
mock.module('$lib/auth/complete-sign-in', () => ({ completeAuthSignIn: async () => true }));
mock.module('$lib/i18n', () => ({ t: { subscribe: (fn: (value: unknown) => void) => { fn((key: string) => key); return () => {}; } } }));
const { PasswordlessPanelState } = await import('../../src/lib/smart-components/passwordless-panel/passwordless-panel-state.svelte');
const { TestOtpPanelState } = await import('../../src/lib/smart-components/test-otp-panel/test-otp-panel-state.svelte');
const primary = (challenge = 'first'): PrimaryStatus => ({ state: 'primary_required', challenge, lifecycle: 'pending', channel: 'email', delivery: 'sent', expiresAt: 1000, nextResendAt: 100, serverNow: 0, actions: { resend: true, sms: false } });
const input = { email: 'person@edaya.test', locale: 'en' as const, recoveryEligible: false, enroll: false, link: false, onComplete: async () => {} };
beforeEach(() => {
	calls.length = 0;
	outcome = { data: primary(), error: null };
	peek = async () => ({ data: { challenge: 'first', otp: '123456', expiresAt: 1000 }, error: null });
});
describe('shared authentication state ownership', () => {
	test('validates contacts and preserves retry identity after transport failure', async () => {
		const state = new PasswordlessPanelState();
		await state.submit({ ...input, email: 'incomplete' }); expect(calls).toHaveLength(0); expect(state.error).toBe('auth.invalidContact');
		outcome = { data: null, error: { code: 'network_error', message: 'offline' } };
		await state.submit(input); const request = calls[0]!.args[0]; expect(state.busy).toBe(false); expect(state.retryRequest).not.toBeNull();
		outcome = { data: primary(), error: null }; await state.retry(input.onComplete);
		expect(calls[1]!.args[0]).toEqual(request); expect(state.challenge).toBe('first'); expect(state.error).toBe('');
	});
	test('owns enrollment, primary, authenticator, recovery and linked-contact requests', async () => {
		for (const [stage, recovery, enroll, expected] of [
			['form', false, true, 'enroll'], ['primary_required', false, false, 'verifyOtp'],
			['enrollment_required', false, false, 'confirmEnrollment'], ['totp_required', false, false, 'verifyTotp'],
			['totp_required', true, false, 'recover'],
		] as const) {
			const state = new PasswordlessPanelState(); state.state = stage; state.recovery = recovery; state.challenge = 'challenge'; state.code = 'code';
			await state.submit({ ...input, enroll }); expect(calls.at(-1)?.method).toBe(expected);
		}
		await new PasswordlessPanelState().submit({ ...input, link: true }); expect(calls.at(-1)?.method).toBe('linkIdentifier');
	});
	test('discards a revealed code after challenge replacement, expiry or hiding', async () => {
		for (const change of ['replace', 'expire', 'hide'] as const) {
			let current = primary(); let now = 0; let finish!: (value: Awaited<ReturnType<typeof peek>>) => void;
			peek = () => new Promise(resolve => { finish = resolve; });
			const state = new TestOtpPanelState(() => current, () => false, () => now); state.synchronize();
			const read = state.reveal();
			if (change === 'replace') current = primary('next');
			if (change === 'expire') now = 1001;
			if (change === 'hide') state.visible = false;
			state.synchronize(); finish({ data: { challenge: 'first', otp: '123456', expiresAt: 1000 }, error: null }); await read;
			expect(state.otp).toBe(''); expect(state.loading).toBe(false);
		}
	});
});

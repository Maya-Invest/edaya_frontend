import { describe, expect, it } from 'bun:test';
import { createAccessTokenManager, createBearerFetch } from '../../../src/lib/auth/access-token';

const issue = (letter: string) => ({ accessToken: `edaya_at_${letter.repeat(43)}`, expiresAt: new Date(Date.now() + 300_000).toISOString() });

describe('Bearer transport', () => {
	it('shares concurrent renewal and keeps access authority in memory', async () => {
		let calls = 0;
		const manager = createAccessTokenManager(async () => { calls++; return issue('a'); });
		const results = await Promise.all([manager.get(), manager.get(), manager.get()]);
		expect(calls).toBe(1);
		expect(new Set(results).size).toBe(1);
	});
	it('does not resurrect credentials when logout interrupts renewal', async () => {
		let finish!: (value: ReturnType<typeof issue>) => void;
		const manager = createAccessTokenManager(() => new Promise(resolve => { finish = resolve; }));
		const pending = manager.get();
		manager.clear();
		finish(issue('a'));
		await expect(pending).rejects.toThrow('Authentication changed');
	});
	it('omits cookies and retries a denied read only once', async () => {
		let issues = 0;
		let requests = 0;
		const manager = createAccessTokenManager(async () => issue(++issues === 1 ? 'a' : 'b'));
		const send = createBearerFetch(manager, (async (_url, init) => {
			requests++;
			expect(init?.credentials).toBe('omit');
			expect(new Headers(init?.headers).has('cookie')).toBe(false);
			return new Response('', { status: 401 });
		}));
		expect((await send('/core/students', { headers: { cookie: 'ambient' } })).status).toBe(401);
		expect(requests).toBe(2);
		expect(issues).toBe(2);
	});
	it('does not replay a denied payment write', async () => {
		let requests = 0;
		const send = createBearerFetch(createAccessTokenManager(async () => issue('a')), (async () => {
			requests++;
			return new Response('', { status: 401 });
		}));
		await send('/core/commands/record-payment', { method: 'POST', body: '{}' });
		expect(requests).toBe(1);
	});
});

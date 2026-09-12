import { describe, expect, it } from 'bun:test';
import { authPrincipalChanged, canonicalHttpOrigin, createAccessTokenManager, createBearerFetch } from '../../../src/lib/auth/access-token';

const school = 'http://localhost:9999';
const children = 'http://localhost:10000';
const issue = (letter: string) => ({ accessToken: `header.${letter}.signature`, expiresAt: new Date(Date.now() + 300_000).toISOString() });

describe('Bearer transport', () => {
	it('shares concurrent renewal per origin and keeps tokens isolated', async () => {
		const calls: string[] = [];
		const manager = createAccessTokenManager(async (resource) => {
			calls.push(resource);
			return issue(resource === school ? 'a' : 'b');
		});
		const [first, second, third, other] = await Promise.all([
			manager.get(school),
			manager.get(school),
			manager.get(school),
			manager.get(children),
		]);
		expect(calls.sort()).toEqual([children, school]);
		expect(first).toBe(second);
		expect(second).toBe(third);
		expect(other).not.toBe(first);
	});

	it('does not resurrect credentials when logout interrupts every origin', async () => {
		let finishSchool!: (value: ReturnType<typeof issue>) => void;
		let finishChildren!: (value: ReturnType<typeof issue>) => void;
		const manager = createAccessTokenManager(async (resource) => new Promise((resolve) => {
			if (resource === school)
				finishSchool = resolve;
			else
				finishChildren = resolve;
		}));
		const schoolPromise = manager.get(school);
		const childrenPromise = manager.get(children);
		const schoolSettled = schoolPromise.then(
			() => {
				throw new Error('school token should not resolve');
			},
			(error: unknown) => {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toContain('Authentication changed');
			},
		);
		const childrenSettled = childrenPromise.then(
			() => {
				throw new Error('children token should not resolve');
			},
			(error: unknown) => {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toContain('Authentication changed');
			},
		);
		manager.clear();
		finishSchool(issue('a'));
		finishChildren(issue('b'));
		await Promise.all([schoolSettled, childrenSettled]);
	});

	it('omits cookies, pins the destination, and retries a denied read only once', async () => {
		let issues = 0;
		let requests = 0;
		const manager = createAccessTokenManager(async () => issue(++issues === 1 ? 'a' : 'b'));
		const send = createBearerFetch(manager, school, (async (_url, init) => {
			requests++;
			expect(init?.credentials).toBe('omit');
			expect(new Headers(init?.headers).has('cookie')).toBe(false);
			return new Response('', { status: 401 });
		}));
		expect((await send(`${school}/core/students`, { headers: { cookie: 'ambient' } })).status).toBe(401);
		expect(requests).toBe(2);
		expect(issues).toBe(2);
	});

	it('does not replay a denied payment write', async () => {
		let requests = 0;
		const send = createBearerFetch(createAccessTokenManager(async () => issue('a')), school, (async () => {
			requests++;
			return new Response('', { status: 401 });
		}));
		await send(`${school}/core/commands/record-payment`, { method: 'POST', body: '{}' });
		expect(requests).toBe(1);
	});

	it('refuses to attach a token to a different origin', async () => {
		const send = createBearerFetch(createAccessTokenManager(async () => issue('a')), school);
		await expect(send(`${children}/core/students`)).rejects.toThrow('API credentials cannot be sent to this destination');
	});

	it('invalidates only the rejected origin', async () => {
		let schoolIssues = 0;
		const manager = createAccessTokenManager(async (resource) => {
			if (resource === school) {
				schoolIssues += 1;
				return issue(`s${schoolIssues}`);
			}
			return issue('c');
		});
		const schoolToken = await manager.get(school);
		const childrenToken = await manager.get(children);
		expect(await manager.get(`${school}/core`)).toBe(schoolToken);
		manager.invalidate(school, schoolToken);
		expect(await manager.get(children)).toBe(childrenToken);
		expect(await manager.get(school)).not.toBe(schoolToken);
	});

	it('detects principal replacement', () => {
		expect(authPrincipalChanged('a', 'b')).toBe(true);
		expect(authPrincipalChanged('a', 'a')).toBe(false);
		expect(authPrincipalChanged(null, 'a')).toBe(false);
		expect(canonicalHttpOrigin(`${school}/path`)).toBe(school);
	});
});

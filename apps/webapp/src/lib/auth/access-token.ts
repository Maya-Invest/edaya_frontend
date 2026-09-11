/** Access tokens live only in memory. Renewal is serialized within this tab. */
export function createAccessTokenManager(issue: () => Promise<{ accessToken: string; expiresAt: string }>) {
	let token: { accessToken: string; expiresAt: string } | null = null;
	let pending: Promise<string> | null = null;
	let generation = 0;
	function clear() {
		generation += 1;
		token = null;
		pending = null;
	}
	async function get(): Promise<string> {
		if (token && Date.parse(token.expiresAt) > Date.now() + 30_000) {
			return token.accessToken;
		}
		if (!pending) {
			const started = generation;
			pending = issue().then((issued) => {
				if (started !== generation) {
					throw new Error('Authentication changed during renewal');
				}
				if (!/^edaya_at_[\w-]{43}$/.test(issued.accessToken) || !(Date.parse(issued.expiresAt) > Date.now())) {
					throw new Error('Invalid API token response');
				}
				token = issued;
				return issued.accessToken;
			}).finally(() => {
				if (started === generation) {
					pending = null;
				}
			});
		}
		return pending;
	}
	function invalidate(rejectedToken: string) {
		if (token?.accessToken === rejectedToken) {
			token = null;
		}
	}
	return { get, clear, invalidate };
}

export function createBearerFetch(manager: ReturnType<typeof createAccessTokenManager>, send: (url: string, init?: RequestInit) => Promise<Response> = fetch) {
	return async (url: string, init: RequestInit = {}): Promise<Response> => {
		const token = await manager.get();
		const headers = new Headers(init.headers);
		headers.delete('cookie');
		headers.set('Authorization', `Bearer ${token}`);
		const response = await send(url, { ...init, headers, credentials: 'omit' });
		if (response.status !== 401) {
			return response;
		}
		manager.invalidate(token);
		// Never replay writes: a network or middleware failure may follow a commit.
		if (!['GET', 'HEAD'].includes((init.method ?? 'GET').toUpperCase())) {
			return response;
		}
		await response.body?.cancel();
		headers.set('Authorization', `Bearer ${await manager.get()}`);
		return send(url, { ...init, headers, credentials: 'omit' });
	};
}

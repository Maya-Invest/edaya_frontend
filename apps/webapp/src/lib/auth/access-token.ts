/** Access tokens live only in memory, keyed by canonical API origin. Renewal is serialized per origin. */
export function canonicalHttpOrigin(value: string): string {
	let parsed: URL;
	try {
		parsed = new URL(value);
	}
	catch {
		throw new Error('Invalid API origin');
	}
	if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.username || parsed.password) {
		throw new Error('Invalid API origin');
	}
	return parsed.origin;
}

export function authPrincipalChanged(previous: string | null | undefined, next: string | null | undefined): boolean {
	return Boolean(previous && next && previous !== next);
}

export function createAccessTokenManager(
	issue: (resource: string) => Promise<{ accessToken: string; expiresAt: string }>,
) {
	const tokens = new Map<string, { accessToken: string; expiresAt: string }>();
	const pending = new Map<string, Promise<string>>();
	let generation = 0;
	function clear() {
		generation += 1;
		tokens.clear();
		pending.clear();
	}
	async function get(resource: string): Promise<string> {
		const origin = canonicalHttpOrigin(resource);
		const cached = tokens.get(origin);
		if (cached && Date.parse(cached.expiresAt) > Date.now() + 30_000) {
			return cached.accessToken;
		}
		let inflight = pending.get(origin);
		if (!inflight) {
			const started = generation;
			inflight = issue(origin).then((issued) => {
				if (started !== generation) {
					throw new Error('Authentication changed during renewal');
				}
				const segments = issued.accessToken.split('.');
				if (segments.length !== 3 || segments.some(segment => !segment) || !(Date.parse(issued.expiresAt) > Date.now())) {
					throw new Error('Invalid API token response');
				}
				tokens.set(origin, issued);
				return issued.accessToken;
			}).finally(() => {
				if (started === generation) {
					pending.delete(origin);
				}
			});
			pending.set(origin, inflight);
		}
		return inflight;
	}
	function invalidate(resource: string, rejectedToken: string) {
		const origin = canonicalHttpOrigin(resource);
		if (tokens.get(origin)?.accessToken === rejectedToken) {
			tokens.delete(origin);
		}
	}
	return { get, clear, invalidate };
}

export function isUnauthorizedCredentialError(error: unknown): boolean {
	return typeof error === 'object'
		&& error !== null
		&& 'status' in error
		&& (error as { status: unknown }).status === 401;
}

export function createBearerFetch(
	manager: ReturnType<typeof createAccessTokenManager>,
	resource: string,
	send: (url: string, init?: RequestInit) => Promise<Response> = fetch,
) {
	const origin = canonicalHttpOrigin(resource);
	return async (url: string, init: RequestInit = {}): Promise<Response> => {
		const target = new URL(url, origin);
		if (target.origin !== origin || target.username || target.password) {
			throw new Error('API credentials cannot be sent to this destination');
		}

		async function resolveToken(): Promise<string | null> {
			try {
				return await manager.get(origin);
			}
			catch (error) {
				if (!isUnauthorizedCredentialError(error)) {
					throw error;
				}
				return null;
			}
		}

		function authorized(token: string | null): Promise<Response> {
			const headers = new Headers(init.headers);
			headers.delete('cookie');
			if (token) {
				headers.set('Authorization', `Bearer ${token}`);
			}
			else {
				headers.delete('Authorization');
			}
			return send(target.href, { ...init, headers, credentials: 'omit' });
		}

		const token = await resolveToken();
		const response = await authorized(token);
		if (response.status !== 401 || !token) {
			return response;
		}
		manager.invalidate(origin, token);
		if (!['GET', 'HEAD'].includes((init.method ?? 'GET').toUpperCase())) {
			return response;
		}
		await response.body?.cancel();
		return authorized(await resolveToken());
	};
}

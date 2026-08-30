import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

const authSession = {
	isLoggedIn: false,
	ready: true,
	markLoading() {
		this.ready = false;
	},
	markReady() {
		this.ready = true;
	},
	clear: mock(() => {
		authSession.isLoggedIn = false;
	}),
	setAuthAccountOnly: mock(() => {
		authSession.isLoggedIn = false;
	}),
};

mock.module('$lib/auth/session.svelte', () => ({
	authSession,
}));

let getSessionImpl: () => Promise<{ data: { session: unknown; user: unknown } }> = async () => ({
	data: { session: null, user: null },
});

mock.module('$lib/auth/client', () => ({
	authClient: {
		getSession: () => getSessionImpl(),
	},
}));

const { bootstrapAuthOnly, resetBootstrapSession } = await import('$lib/auth/bootstrap');

describe('bootstrapAuthOnly', () => {
	beforeEach(() => {
		resetBootstrapSession();
		authSession.isLoggedIn = false;
		authSession.ready = true;
		authSession.clear.mockClear();
		authSession.setAuthAccountOnly.mockClear();
	});

	afterEach(() => {
		resetBootstrapSession();
		authSession.isLoggedIn = false;
		authSession.ready = true;
	});

	it('does not clear a full session when a stale getSession returns empty', async () => {
		let release: (value: { data: { session: null; user: null } }) => void = () => {};
		getSessionImpl = () => new Promise((resolve) => {
			release = resolve;
		});

		const authOnly = bootstrapAuthOnly();
		authSession.isLoggedIn = true;

		release({ data: { session: null, user: null } });
		await authOnly;

		expect(authSession.clear).not.toHaveBeenCalled();
		expect(authSession.setAuthAccountOnly).not.toHaveBeenCalled();
		expect(authSession.isLoggedIn).toBe(true);
	});

	it('does not replace grants when getSession returns an auth account after login', async () => {
		let release: (value: {
			data: { session: { id: string }; user: { id: string; email: string } };
		}) => void = () => {};
		getSessionImpl = () => new Promise((resolve) => {
			release = resolve;
		});

		const authOnly = bootstrapAuthOnly();
		authSession.isLoggedIn = true;

		release({
			data: {
				session: { id: 's1' },
				user: { id: 'user-1', email: 'a.kone@ecole-ci.edaya.dev' },
			},
		});
		await authOnly;

		expect(authSession.setAuthAccountOnly).not.toHaveBeenCalled();
		expect(authSession.isLoggedIn).toBe(true);
	});

	it('ignores in-flight auth-only work after resetBootstrapSession', async () => {
		let release: (value: { data: { session: null; user: null } }) => void = () => {};
		getSessionImpl = () => new Promise((resolve) => {
			release = resolve;
		});

		const authOnly = bootstrapAuthOnly();
		resetBootstrapSession();
		authSession.isLoggedIn = true;

		release({ data: { session: null, user: null } });
		await authOnly;

		expect(authSession.clear).not.toHaveBeenCalled();
		expect(authSession.isLoggedIn).toBe(true);
	});
});

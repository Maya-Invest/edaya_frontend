import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

const captured: Headers[] = [];
const bearerFetch = mock(async (_url: string, init?: RequestInit) => {
	captured.push(new Headers(init?.headers));
	return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
});

mock.module('$lib/auth/bearer-fetch', () => ({
	bearerFetch,
}));

const { authSession } = await import('$lib/auth/session.svelte');
const { createBrowserTransport } = await import('$lib/api/browser-transport');

describe('browser transport actor headers', () => {
	beforeEach(() => {
		captured.length = 0;
		bearerFetch.mockClear();
		authSession.sessionKind = 'staff';
		authSession.userId = 'st-b';
		authSession.schoolId = 'school-b';
	});

	afterEach(() => {
		authSession.sessionKind = null;
		authSession.userId = null;
		authSession.schoolId = 'school-1';
	});

	it('sends X-Actor-Kind, X-Actor-Id and X-School-Id after a school switch', async () => {
		await createBrowserTransport(() => undefined).request('GET', '/core/authorization/effective-grants');
		expect(captured).toHaveLength(1);
		expect(captured[0]?.get('X-Actor-Kind')).toBe('staff');
		expect(captured[0]?.get('X-Actor-Id')).toBe('st-b');
		expect(captured[0]?.get('X-School-Id')).toBe('school-b');
	});
});

import { describe, expect, test } from 'bun:test';
import { VersionedRouteQuery } from '$lib/navigation/versioned-route-query';
function ledger() {
    let current = 0;
    let loaded = -1;
    return { bump: () => { current++; }, markLoaded: () => { loaded = current; }, hasLoaded: () => loaded >= 0, isStale: () => current !== loaded };
}
const url = new URL('http://local/subject/one/progression');
describe('lazy tab version invalidation', () => {
    test('does not load unvisited tabs and refetches a loaded tab once after a write', async () => {
        const versions = ledger(); const state = new VersionedRouteQuery(versions); let requests = 0;
        const query = state.track(async () => { requests++; return { status: 'ready' as const }; });
        await state.invalidateIfStale(); expect(requests).toBe(0);
        await query(url); await state.invalidateIfStale(); expect(requests).toBe(1);
        versions.bump(); await Promise.all([state.invalidateIfStale(), state.invalidateIfStale()]);
        expect(requests).toBe(2); expect(versions.isStale()).toBe(false);
    });
    test('failed refresh stays stale and retries on next navigation', async () => {
        const versions = ledger(); const state = new VersionedRouteQuery(versions); let fail = false;
        const query = state.track(async () => ({ status: fail ? 'error' as const : 'ready' as const }));
        await query(url); versions.bump(); fail = true;
        await state.invalidateIfStale(); expect(versions.isStale()).toBe(true);
        fail = false; await state.invalidateIfStale(); expect(versions.isStale()).toBe(false);
    });
    test('closing a tab aborts its refresh and prevents further loads', async () => {
        const versions = ledger(); const state = new VersionedRouteQuery(versions); let release = () => {}; let defer = false; let lastSignal: AbortSignal | undefined;
        const query = state.track(async (_, { signal }) => {
            lastSignal = signal;
            if (defer) await new Promise<void>(resolve => { release = resolve; });
            signal.throwIfAborted(); return { status: 'ready' as const };
        });
        await query(url); versions.bump(); defer = true;
        const refreshing = state.invalidateIfStale(); state.clear(); expect(lastSignal?.aborted).toBe(true);
        release(); await refreshing; await state.invalidateIfStale(); expect(versions.isStale()).toBe(true);
    });
});

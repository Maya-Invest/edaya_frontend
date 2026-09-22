import { describe, expect, it } from 'bun:test';
import {
	composePageQueryIdentity,
	isCacheablePageQueryResult,
	isPageQueryAbortError,
	withAcademicScopeSegment,
} from '$lib/queries/page-query-runtime';

describe('page query runtime', () => {
	it('treats status-only objects as uncacheable', () => {
		expect(isCacheablePageQueryResult({ status: 'ready' })).toBe(false);
		expect(isCacheablePageQueryResult({ status: 'error', errorMessage: 'nope' })).toBe(false);
		expect(isCacheablePageQueryResult({ status: 'ready', evaluations: [] })).toBe(true);
	});

	it('includes academic generation in the loaded identity', () => {
		expect(composePageQueryIdentity('/classes/6a/evaluations', 0)).toBe('/classes/6a/evaluations@g0');
		expect(composePageQueryIdentity('/classes/6a/evaluations', 4)).toBe('/classes/6a/evaluations@g4');
	});

	it('appends a scope segment without colliding with demo keys', () => {
		expect(withAcademicScopeSegment('/school/students?demo=empty', 'sch|year|period'))
			.toBe('/school/students?demo=empty::scope=sch|year|period');
	});

	it('recognizes abort errors so loaders do not turn them into page errors', () => {
		const controller = new AbortController();
		controller.abort();
		try {
			controller.signal.throwIfAborted();
			throw new Error('expected abort');
		}
		catch (error) {
			expect(isPageQueryAbortError(error)).toBe(true);
		}
	});
});

import { afterEach, describe, expect, it } from 'bun:test';
import {
	academicScopeCacheSegment,
	academicScopeIdentity,
	nextAcademicScopeGeneration,
} from '$lib/academic/academic-scope';
import {
	getPageQueryCache,
	invalidatePageQueryCache,
	setPageQueryCache,
} from '$lib/queries/page-query-cache';

describe('academic scope identity', () => {
	afterEach(() => {
		invalidatePageQueryCache();
	});

	it('bumps generation when school, year, or period identity changes', () => {
		expect(nextAcademicScopeGeneration(
			academicScopeIdentity('sch-1', 'year-1', 'period-1'),
			academicScopeIdentity('sch-1', 'year-2', 'period-1'),
			4,
		)).toEqual({ generation: 5, changed: true });
	});

	it('does not bump when the same scope is selected again', () => {
		const identity = academicScopeIdentity('sch-1', 'year-1', 'period-1');
		expect(nextAcademicScopeGeneration(identity, identity, 4)).toEqual({
			generation: 4,
			changed: false,
		});
	});

	it('omits empty ids from cache key segments', () => {
		expect(academicScopeCacheSegment('', '', '')).toBe('');
		expect(academicScopeCacheSegment('sch-1', 'year-1', '')).toBe('sch-1|year-1');
	});

	it('clears PageQuery cache when scope identity changes', () => {
		setPageQueryCache('/classes/6a/evaluations', { status: 'ready', evaluations: [1] });
		const next = nextAcademicScopeGeneration(
			academicScopeIdentity('sch-1', 'year-1', 'period-1'),
			academicScopeIdentity('sch-1', 'year-2', 'period-1'),
			0,
		);
		if (next.changed) {
			invalidatePageQueryCache();
		}
		expect(getPageQueryCache('/classes/6a/evaluations')).toBeUndefined();
	});
});

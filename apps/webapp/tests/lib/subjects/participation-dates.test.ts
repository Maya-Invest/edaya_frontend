import { describe, expect, test } from 'bun:test';
import { bulkParticipationOperations, commonSelection } from '../../../src/lib/subjects/bulk-participation';
import type { Enrollment } from '../../../src/lib/subjects/subject-selection';

describe('optional subject selections', () => {
  test('bulk replacement ignores closed placements and carries the explicit desired selection', () => {
    const placement = { id: 'placement', studentId: 'student', classGroupId: 'class', academicYearId: 'year', status: 'active' as const, enrollmentIndex: 1, enrolledAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' };
    const operations = bulkParticipationOperations({ placements: [placement, { ...placement, id: 'closed', endedAt: '2026-01-02T00:00:00Z' }], selected: ['placement', 'closed'], classSubjectId: 'music', selection: { scope: 'none' } });
    expect(operations).toEqual([{ studentClassEnrollmentId: 'placement', classSubjectId: 'music', selection: { scope: 'none' } }]);
  });
  test('mixed choices require an explicit replacement and ignore tombstones', () => {
    const enrollment = { id: 'choice', studentClassEnrollmentId: 'first', classSubjectId: 'music', scope: 'annual', periods: [], source: 'explicit', revision: 0, enrolledAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' } as Enrollment;
    expect(commonSelection(['first', 'second'], [enrollment])).toBeNull();
    expect(commonSelection(['first'], [enrollment])).toEqual({ scope: 'annual' });
    expect(commonSelection(['first'], [{ ...enrollment, deletedAt: '2026-02-01T00:00:00Z', deletedBy: 'staff' }])).toEqual({ scope: 'none' });
  });
});

import { describe, expect, it } from 'bun:test';
import { groupModuleSubjects } from '../../../../../src/routes/(app)/configuration/structure/subjects/lib/module-groups';
import type { Subject } from '$lib/types/school';
const subjects = [{ id: 'math', name: 'Math', reportModuleId: 'science', coefficient: 3 }, { id: 'physics', name: 'Physics', reportModuleId: 'science', coefficient: 2 }, { id: 'arts', name: 'Arts', coefficient: 1 }] as Subject[];
const modules = [{ id: 'science', name: 'Science', schoolId: 'school', gradeLevelId: 'grade', academicYearId: 'year', order: 1, weightingMode: 'subject_coefficients' as const }, { id: 'empty', name: 'Empty', schoolId: 'school', gradeLevelId: 'grade', academicYearId: 'year', order: 2, weightingMode: 'explicit' as const, explicitWeight: 2 }];
describe('flat module grouping', () => {
 it('keeps empty modules and puts ungrouped subjects last', () => { const groups = groupModuleSubjects(subjects, modules, () => true, false); expect(groups.map(g => g.id)).toEqual(['science', 'empty', 'ungrouped']); expect(groups[2]?.items[0]?.id).toBe('arts'); });
 it('filters visible rows without changing configured sums', () => { const groups = groupModuleSubjects(subjects, modules, s => s.id === 'math', true); expect(groups).toHaveLength(1); expect(groups[0]?.items).toHaveLength(1); expect(groups[0]?.coefficientSum).toBe(5); });
 it('does not invent missing coefficients or overwrite explicit weights', () => { const groups = groupModuleSubjects([{ ...subjects[0]!, coefficient: undefined }], modules, () => true, false); expect(groups[0]?.missingCoefficients).toBe(true); expect(groups[1]?.module?.explicitWeight).toBe(2); });
});

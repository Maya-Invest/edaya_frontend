export const scale = { id: 'points', schoolId: 'school', name: 'Detailed point scale', isDefault: false, minScore: 0, maxScore: 4, passingScore: 2, decimalPlaces: 2, roundingMode: 'nearest' as const, intervalConvention: 'continuous' as const, revision: 1, ranges: [
  { id: 'f', letter: 'F', interpretation: 'Needs improvement', minScore: 0, maxScore: 2, isPassing: false, gpaValue: 0 },
  { id: 'b', letter: 'B', interpretation: 'Good', minScore: 2, maxScore: 3.5, isPassing: true, gpaValue: 3 },
  { id: 'a', letter: 'A', interpretation: 'Excellent', minScore: 3.5, maxScore: 4, isPassing: true, gpaValue: 4 },
] }
export const level = { id: 'level', schoolId: 'school', name: 'International bilingual programme', label: 'Level', cycle: '', order: 1, gradingPolicies: [{ academicYearId: 'year', revision: 1, mode: 'numeric-first' as const, aggregateLabel: 'Moyenne générale', scale, numericEquivalents: {}, status: 'completed' as const }] }
export const evidence = $state({ requests: [] as unknown[] })
export const getGradeScalesPageState = () => ({ updateScale: async (input: unknown) => { evidence.requests.push(input); return true }, createScale: async (input: unknown) => { evidence.requests.push(input); return true } })
export const getGradeLevelsPageState = () => ({ gradingLevel: level, gradingScales: [scale], gradingLoading: false, gradingError: '', configureGrading: async (input: unknown) => { evidence.requests.push(input); return true }, loadGrading: async () => {} })

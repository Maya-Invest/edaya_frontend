const classes = ['a', 'b', 'c'].map((id, index) => ({ id, name: `Class ${id.toUpperCase()}`, gradeLevelId: index === 2 ? 'grade-2' : 'grade-1', academicYearId: 'year', schoolId: 'school', level: 'Secondary', studentCount: 0, attendanceMode: 'session' as const }));
export const academicContext = $state({
	yearId: 'year',
	year: { startDate: '2026-09-07', endDate: '2026-12-04' },
	period: null,
	classes,
	gradeLevels: [{ id: 'grade-1', name: 'Grade 1', label: 'Grade 1', order: 1 }, { id: 'grade-2', name: 'Grade 2', label: 'Grade 2', order: 2 }],
	schools: [{ id: 'school', timetableGenerationMode: 'weekly', timetableMinDayGapSameSubject: 1, timetableMinPeriodSpan: 1, timetableMaxPeriodSpan: 1 }],
	periodDefinitionsForYear: () => [],
	periodsForYear: [],
});

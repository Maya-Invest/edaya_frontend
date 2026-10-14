import { level } from './action-state.svelte';
export const academicContext = $state({ yearId: 'year', year: { id: 'year', label: '2026–2027', status: 'published', startDate: '2020-01-01', endDate: '2099-12-31' }, gradeLevels: [level], gradeLevelById: (id: string) => id === level.id ? level : undefined });

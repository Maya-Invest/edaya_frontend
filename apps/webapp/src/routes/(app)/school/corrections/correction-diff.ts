import type { CorrectionDetail } from './corrections-page.svelte';

export interface CorrectionDiffRow { label: string;	before: string;	proposed: string }
export function correctionDiff(detail: CorrectionDetail, translate: (key: string) => string): CorrectionDiffRow[] {
	const name = (id: string) => detail.context.students.find(student => student.id === id)?.name ?? translate('corrections.student');
	const display = (value: unknown): string => {
		if (value == null || value === '')
			return '—';
		if (typeof value === 'number')
			return String(value);
		if (typeof value === 'string') {
			if (['present', 'absent', 'late', 'scored', 'exempt', 'met', 'missed', 'excused', 'positive', 'minor_infraction', 'major_infraction', 'emergency'].includes(value))
				return translate(`corrections.value.${value}`);
			return value;
		}
		return String(value);
	};
	const row = detail.correction;
	const fieldNames = detail.original?.fieldNames as Record<string, string> | undefined;
	const mentionLabels = detail.original?.mentionLabels as Record<string, string> | undefined;
	const displayField = (key: string, value: unknown) => key === 'mentionId' && typeof value === 'string' ? mentionLabels?.[value] ?? value : display(value);
	if (row.workflow === 'grades')
		return row.changes.flatMap(change => (['score', 'mentionId', 'designation', 'status', 'notes'] as const).filter(key => (change.before[key] ?? null) !== (change.proposed[key] ?? null)).map(key => ({ label: `${name(change.studentId)} · ${translate(`corrections.field.${key}`)}`, before: displayField(key, change.before[key]), proposed: displayField(key, change.proposed[key]) })));
	const before = row.before as Record<string, unknown>;
	const proposed = row.proposal as Record<string, unknown>;
	const rows: CorrectionDiffRow[] = [];
	for (const key of ['status', 'notes', 'teacherExplanation', 'teacherComment', 'title', 'description', 'kind']) {
		if (before[key] !== proposed[key])
			rows.push({ label: translate(`corrections.field.${key}`), before: display(before[key]), proposed: display(proposed[key]) });
	}
	if (row.workflow === 'discipline' && row.before.workflow === 'discipline' && row.proposal.workflow === 'discipline')
		rows.push({ label: translate('corrections.field.students'), before: row.before.studentIds.map(name).join(', '), proposed: row.proposal.studentIds.map(name).join(', ') });
	if (row.workflow === 'report_comments' && row.before.workflow === 'report_comments' && row.proposal.workflow === 'report_comments') {
		for (const [index, section] of row.proposal.sections.entries()) {
			const original = row.before.sections.find(item => item.sectionId === section.sectionId);
			if (original?.comment !== section.comment)
				rows.push({ label: fieldNames?.[section.sectionId] ?? `${translate('corrections.field.comment')} ${index + 1}`, before: display(original?.comment), proposed: display(section.comment) });
		}
	}
	if (row.workflow === 'logbook' && row.before.workflow === 'logbook' && row.proposal.workflow === 'logbook') {
		const decode = (note: string | null): Record<string, unknown> => {
			try {
				const value = JSON.parse(note ?? '');
				return typeof value === 'object' && value ? (value.edayaLogbook ?? value) : { content: note };
			}
			catch {
				return { content: note };
			}
		};
		const original = decode(row.before.sessionNote);
		const next = decode(row.proposal.sessionNote);
		for (const key of new Set([...Object.keys(original), ...Object.keys(next)])) {
			if (JSON.stringify(original[key]) !== JSON.stringify(next[key]))
				rows.push({ label: translate(`corrections.field.${key}`), before: Array.isArray(original[key]) ? original[key].join('\n') : display(original[key]), proposed: Array.isArray(next[key]) ? next[key].join('\n') : display(next[key]) });
		}
		const matterIds = new Set([...row.before.progress.map(p => p.matterId), ...row.proposal.progress.map(p => p.matterId)]);
		for (const [index, matterId] of [...matterIds].entries()) {
			const original = row.before.progress.find(p => p.matterId === matterId);
			const next = row.proposal.progress.find(p => p.matterId === matterId);
			const label = fieldNames?.[matterId] ?? `${translate('corrections.field.progress')} ${index + 1}`;
			const coverage = (entry: typeof original) => entry ? translate(entry.completed ? 'logbook.finished' : 'logbook.covered') : '—';
			if (original?.completed !== next?.completed)
				rows.push({ label, before: coverage(original), proposed: coverage(next) });
			if ((original?.notes ?? '') !== (next?.notes ?? ''))
				rows.push({ label: `${label} · ${translate('teaching.notes')}`, before: display(original?.notes), proposed: display(next?.notes) });
		}
	}
	return rows;
}

export function correctionRevisionDiff(detail: CorrectionDetail, version: number, translate: (key: string) => string): CorrectionDiffRow[] {
	const row = detail.correction;
	if (row.workflow === 'grades') {
		const revision = row.revisions.find(r => r.version === version);
		return revision ? correctionDiff({ ...detail, correction: { ...row, changes: revision.changes } }, translate) : [];
	}
	const revision = row.revisions.find(r => r.version === version);
	return revision ? correctionDiff({ ...detail, correction: { ...row, proposal: revision.proposal } }, translate) : [];
}

export function legacyPercentages(detail: CorrectionDetail) {
	const original = detail.original?.legacyOriginal as { before?: { progress?: { matterId: string; completedPercentage: number }[] }; proposal?: { progress?: { matterId: string; completedPercentage: number }[] } } | undefined;
	const names = detail.original?.fieldNames as Record<string, string> | undefined;
	const before = new Map(original?.before?.progress?.map(p => [p.matterId, p.completedPercentage]));
	const proposed = new Map(original?.proposal?.progress?.map(p => [p.matterId, p.completedPercentage]));
	return [...new Set([...before.keys(), ...proposed.keys()])].map(id => ({
		id,
		name: names?.[id] ?? id,
		before: before.has(id) ? `${before.get(id)}%` : '—',
		proposed: proposed.has(id) ? `${proposed.get(id)}%` : '—',
	}));
}

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
	if (row.workflow === 'grades')
		return row.changes.flatMap(change => (['score', 'designation', 'status', 'notes'] as const).filter(key => change.before[key] !== change.proposed[key]).map(key => ({ label: `${name(change.studentId)} · ${translate(`corrections.field.${key}`)}`, before: display(change.before[key]), proposed: display(change.proposed[key]) })));
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
			const original = row.before.progress.find(p => p.matterId === matterId)?.completedPercentage;
			const next = row.proposal.progress.find(p => p.matterId === matterId)?.completedPercentage;
			if (original !== next)
				rows.push({ label: fieldNames?.[matterId] ?? `${translate('corrections.field.progress')} ${index + 1}`, before: original == null ? '—' : `${original}%`, proposed: next == null ? '—' : `${next}%` });
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

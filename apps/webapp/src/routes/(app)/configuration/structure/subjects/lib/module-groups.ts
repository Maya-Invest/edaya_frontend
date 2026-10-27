import type { ReportModule } from '$lib/types/report-cards';
import type { Subject } from '$lib/types/school';

/** Configuration totals always use every member, independently of display filters. */
export function groupModuleSubjects(subjects: readonly Subject[], modules: readonly ReportModule[], matches: (subject: Subject) => boolean, filtered: boolean) {
	const ordered = [...subjects].sort((a, b) => (a.reportOrder ?? 0) - (b.reportOrder ?? 0) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
	const groups = [...modules].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map((module) => {
		const members = ordered.filter(subject => subject.reportModuleId === module.id);
		return { id: module.id, module, members, items: members.filter(matches), coefficientSum: members.reduce((sum, subject) => sum + (subject.coefficient ?? 0), 0), missingCoefficients: members.some(subject => subject.coefficient == null) };
	});
	const members = ordered.filter(subject => !subject.reportModuleId);
	return [...groups, { id: 'ungrouped', module: undefined, members, items: members.filter(matches), coefficientSum: 0, missingCoefficients: false }].filter(group => !filtered || group.items.length > 0);
}

import type { AcademicCalendarFields } from '$lib/api/mutations/academic.mutations';
import type { AcademicPeriod, AcademicYear } from '$lib/types/school';
import { formatDateInput } from '$lib/date/format';

function validDate(value: string): boolean {
	const parsed = new Date(`${value}T00:00:00Z`);
	return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function calendarFormError(fields: AcademicCalendarFields, year: AcademicYear, periods: readonly AcademicPeriod[], period?: AcademicPeriod, editingYear = false): string | undefined {
	if (!fields.name.trim())
		return 'academic.nameRequired';
	if (!validDate(fields.startDate) || !validDate(fields.endDate) || fields.startDate > fields.endDate)
		return 'academic.invalidDates';
	if (year.status === 'archived')
		return 'academic.archivedReadOnly';
	const siblings = periods.filter(entry => entry.academicYearId === year.id);
	if (editingYear) {
		if (siblings.some(entry => formatDateInput(entry.startDate) < fields.startDate || formatDateInput(entry.endDate) > fields.endDate))
			return 'academic.excludesPeriods';
		return undefined;
	}
	if (fields.startDate < formatDateInput(year.startDate) || fields.endDate > formatDateInput(year.endDate))
		return 'academic.outsideYear';
	const datesChanged = !period || fields.startDate !== formatDateInput(period.startDate) || fields.endDate !== formatDateInput(period.endDate);
	if (datesChanged && siblings.some(entry => entry.id !== period?.id && formatDateInput(entry.startDate) <= fields.endDate && formatDateInput(entry.endDate) >= fields.startDate))
		return 'academic.overlap';
	return undefined;
}

export function defaultPeriodType(periods: readonly AcademicPeriod[]): AcademicPeriod['type'] {
	const types = new Set(periods.map(period => period.type));
	return types.size === 1 ? periods[0]?.type ?? 'trimester' : 'trimester';
}

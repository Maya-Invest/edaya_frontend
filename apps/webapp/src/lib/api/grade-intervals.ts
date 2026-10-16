import type { GradeScaleRange } from '$lib/types/report-cards';

export function newGradeIntervals(): GradeScaleRange[] {
	return [
		{ id: crypto.randomUUID(), letter: 'D', interpretation: 'Insuffisant', minScore: 0, maxScore: 10 },
		{ id: crypto.randomUUID(), letter: 'C', interpretation: 'Assez bien', minScore: 10, maxScore: 14 },
		{ id: crypto.randomUUID(), letter: 'B', interpretation: 'Bien', minScore: 14, maxScore: 16 },
		{ id: crypto.randomUUID(), letter: 'A', interpretation: 'Très bien', minScore: 16, maxScore: 20 },
	];
}

export function validateGradeIntervals(ranges: GradeScaleRange[], min: number, max: number): boolean {
	if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || min >= max || !ranges.length)
		return false;
	if (ranges[0].minScore !== min || ranges.at(-1)?.maxScore !== max)
		return false;
	if (new Set(ranges.map(row => row.id)).size !== ranges.length || new Set(ranges.map(row => row.letter.trim())).size !== ranges.length)
		return false;
	return ranges.every((row, i) => !!row.id && !!row.letter.trim() && !!row.interpretation?.trim()
		&& Number.isFinite(row.minScore) && Number.isFinite(row.maxScore) && row.minScore < row.maxScore
		&& (i === 0 || ranges[i - 1].maxScore === row.minScore)
		&& (row.gpaValue == null || (Number.isFinite(row.gpaValue) && row.gpaValue >= min && row.gpaValue <= max)));
}

export function lookupGradeInterval(ranges: GradeScaleRange[], value: number, continuous = true): GradeScaleRange | undefined {
	return ranges.find((row, i) => value >= row.minScore && (value < row.maxScore || (value === row.maxScore && (!continuous || i === ranges.length - 1))));
}

export function splitGradeInterval(ranges: GradeScaleRange[], id: string): GradeScaleRange[] {
	return ranges.flatMap((row) => {
		if (row.id !== id)
			return [row];
		const midpoint = (row.minScore + row.maxScore) / 2;
		return [{ ...row, maxScore: midpoint }, { ...row, id: crypto.randomUUID(), letter: `${row.letter}+`, minScore: midpoint }];
	});
}

export function roundedSample(value: number, precision: number, mode: 'nearest' | 'truncate'): number {
	const factor = 10 ** precision;
	const scaled = value * factor;
	const adjusted = scaled + Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
	return (mode === 'truncate' ? Math.trunc(adjusted) : Math.round(adjusted)) / factor;
}

export function validGradeScalePrecision(minimum: number, maximum: number, precision: number): boolean {
	if (!Number.isInteger(precision) || precision < 0 || precision > 3)
		return false;
	return [minimum, maximum].every((bound) => {
		const scaled = bound * 10 ** precision;
		return Number.isFinite(scaled) && Math.abs(scaled - Math.round(scaled)) <= Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
	});
}

/** Builds default A–D letter ranges from scale bounds (aligned with backend onboarding). */

function roundTo2(value: number): number {
	return Math.round(value * 100) / 100;
}

export function buildGradeScaleRanges(minScore: number, maxScore: number, passingScore: number) {
	const clampedPassing = roundTo2(Math.min(Math.max(passingScore, minScore), maxScore));
	const failMax = roundTo2(Math.max(minScore, clampedPassing - 0.01));
	const span = maxScore - clampedPassing;
	const step = span / 3;
	const band1Max = roundTo2(clampedPassing + step - 0.01);
	const band2Max = roundTo2(clampedPassing + step * 2 - 0.01);

	return [
		{
			letter: 'D',
			minScore,
			maxScore: failMax,
			isPassing: false,
			interpretation: 'Insuffisant',
		},
		{
			letter: 'C',
			minScore: clampedPassing,
			maxScore: band1Max,
			isPassing: true,
			interpretation: 'Assez bien',
		},
		{
			letter: 'B',
			minScore: roundTo2(clampedPassing + step),
			maxScore: band2Max,
			isPassing: true,
			interpretation: 'Bien',
		},
		{
			letter: 'A',
			minScore: roundTo2(clampedPassing + step * 2),
			maxScore,
			isPassing: true,
			interpretation: 'Très bien',
		},
	];
}

export function isValidGradeScaleBounds(minScore: number, maxScore: number, passingScore: number): boolean {
	if (!Number.isFinite(minScore) || !Number.isFinite(maxScore) || !Number.isFinite(passingScore)) {
		return false;
	}
	if (minScore >= maxScore) {
		return false;
	}
	if (passingScore <= minScore || passingScore >= maxScore) {
		return false;
	}
	return buildGradeScaleRanges(minScore, maxScore, passingScore).every(
		range => range.minScore <= range.maxScore,
	);
}

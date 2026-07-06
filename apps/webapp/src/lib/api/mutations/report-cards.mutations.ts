import { academicContext } from '$lib/academic/context.svelte';
import { buildGradeScaleRanges } from '$lib/api/grade-scale-ranges';
import { runMutation } from '$lib/api/mutations/run-mutation';
import { loadClassReportCardResultsData } from '$lib/api/report-cards-data';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { detailDataContext } from '$lib/detail-data/context.svelte';
import { refreshReportCardCatalog } from '$lib/queries/report-cards.queries';
import { reportCardsContext } from '$lib/report-cards/context.svelte';

function schoolId(): string {
	return academicContext.schools[0]?.id ?? 'sch-edaya-central';
}

async function refreshClassPeriodResults(classId: string, periodId: string): Promise<void> {
	const results = await loadClassReportCardResultsData(
		getBrowserSchoolClient(),
		classId,
		periodId,
		reportCardsContext.definitions,
	);
	reportCardsContext.seedClassPeriodResults(results, { classId, periodId });
}

function resolveDefinitionId(studentId: string): string | undefined {
	const student = detailDataContext.students.find(entry => entry.id === studentId);
	if (!student) {
		return undefined;
	}

	const cls = academicContext.classes.find(entry => entry.id === student.classId);
	if (!cls) {
		return undefined;
	}

	const definition = reportCardsContext.definitions.find(
		entry =>
			entry.gradeLevelId === cls.gradeLevelId
			&& entry.academicYearId === academicContext.yearId
			&& entry.status === 'published',
	) ?? reportCardsContext.definitions.find(
		entry => entry.gradeLevelId === cls.gradeLevelId && entry.status === 'published',
	);

	return definition?.id;
}

export async function createGradeScaleMutation(input: {
	name: string;
	minScore: number;
	maxScore: number;
	passingScore: number;
	decimalPlaces?: number;
	description?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const id = `gs-${Date.now().toString(36)}`;
	const result = await runMutation(() => client.commands.createGradeScale({
		id,
		schoolId: schoolId(),
		name: input.name.trim(),
		minScore: input.minScore,
		maxScore: input.maxScore,
		decimalPlaces: input.decimalPlaces ?? 2,
		isDefault: false,
		ranges: buildGradeScaleRanges(input.minScore, input.maxScore, input.passingScore),
	}), {
		successMessage: input.successMessage,
		onSuccess: () => refreshReportCardCatalog(),
	});
	return result !== null;
}

export async function updateGradeScaleMutation(input: {
	scaleId: string;
	name: string;
	minScore: number;
	maxScore: number;
	passingScore: number;
	decimalPlaces?: number;
	description?: string;
	successMessage?: string;
}): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const existing = reportCardsContext.scales.find(scale => scale.id === input.scaleId);
	if (!existing) {
		return false;
	}

	const result = await runMutation(() => client.entities.gradeScales.save({
		id: existing.id,
		schoolId: existing.schoolId,
		name: input.name.trim(),
		minScore: input.minScore,
		maxScore: input.maxScore,
		decimalPlaces: input.decimalPlaces ?? existing.decimalPlaces,
		description: input.description?.trim() || existing.description || null,
		isDefault: existing.isDefault ?? false,
		ranges: buildGradeScaleRanges(input.minScore, input.maxScore, input.passingScore),
	}), {
		successMessage: input.successMessage,
		onSuccess: () => refreshReportCardCatalog(),
	});
	return result !== null;
}

export async function createReportCardDefinitionMutation(input: {
	name: string;
	gradeLevelId: string;
	gradeScaleId: string;
	successMessage?: string;
}): Promise<string | null> {
	const client = getBrowserSchoolClient();
	const yearId = academicContext.yearId;
	if (!yearId) {
		return null;
	}

	const id = `rcd-${Date.now().toString(36)}`;
	const result = await runMutation(() => client.commands.createReportCardDefinition({
		id,
		schoolId: schoolId(),
		academicYearId: yearId,
		gradeLevelId: input.gradeLevelId,
		gradeScaleId: input.gradeScaleId,
		name: input.name.trim(),
		kind: 'default',
		status: 'draft',
		isDefault: false,
		description: input.name.trim(),
	}), {
		successMessage: input.successMessage,
		onSuccess: () => refreshReportCardCatalog(),
	});
	return result ? id : null;
}

export async function publishReportCardDefinitionMutation(definitionId: string): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const result = await runMutation(async () => {
		const definition = await client.entities.definitions.get(definitionId);
		return client.entities.definitions.save({
			...definition,
			status: 'published',
		});
	});
	return result !== null;
}

async function generateReportCardResultCommand(
	studentId: string,
	periodId: string,
): Promise<boolean> {
	const definitionId = resolveDefinitionId(studentId);
	if (!definitionId) {
		return false;
	}

	const client = getBrowserSchoolClient();
	const id = `rcr-${studentId}-${periodId}`;
	await client.commands.generateReportCardResult({
		id,
		studentId,
		periodId,
		reportCardDefinitionId: definitionId,
		generatedAt: new Date().toISOString(),
	});
	return true;
}

export async function generateReportCardResultMutation(
	studentId: string,
	periodId = academicContext.periodId,
): Promise<boolean> {
	const classId = detailDataContext.students.find(student => student.id === studentId)?.classId;
	const result = await runMutation(async () => {
		if (!await generateReportCardResultCommand(studentId, periodId)) {
			throw new Error('Aucun modèle de bulletin publié pour cette classe.');
		}
		return true;
	}, {
		errorMessage: 'Impossible de générer le bulletin.',
		onSuccess: () => classId ? refreshClassPeriodResults(classId, periodId) : undefined,
	});
	return result !== null;
}

export async function publishReportCardResultMutation(
	resultId: string,
	studentId: string,
	periodId: string,
	definitionId?: string,
): Promise<boolean> {
	const client = getBrowserSchoolClient();
	const existing = reportCardsContext.results.find(r => r.id === resultId);
	const resolvedDefinitionId = definitionId ?? existing?.definitionId;
	const result = await runMutation(() => client.commands.publishReportCardResult({
		id: resultId,
		studentId,
		periodId,
		reportCardDefinitionId: resolvedDefinitionId,
		publishedAt: new Date().toISOString(),
	}), {
		onSuccess: () => existing
			? refreshClassPeriodResults(existing.classId, periodId)
			: undefined,
	});
	return result !== null;
}

export async function generateReportCardsForClassMutation(
	classId: string,
	periodId = academicContext.periodId,
): Promise<number | null> {
	const students = detailDataContext.students.filter(student => student.classId === classId);
	const pending = students.filter(
		student => !reportCardsContext.results.some(
			result => result.studentId === student.id && result.academicPeriodId === periodId,
		),
	);

	if (pending.length === 0) {
		return 0;
	}

	const result = await runMutation(async () => {
		let count = 0;
		for (const student of pending) {
			if (await generateReportCardResultCommand(student.id, periodId)) {
				count += 1;
			}
		}
		return count;
	}, {
		errorMessage: 'Impossible de générer les bulletins.',
		onSuccess: () => refreshClassPeriodResults(classId, periodId),
	});

	return result;
}

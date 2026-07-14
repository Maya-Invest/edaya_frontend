import type { OnboardingSchoolDraft } from '$lib/onboarding/types';
import { academicContext } from '$lib/academic/context.svelte';
import { configureBrowserSchoolClient, getBrowserSchoolClient } from '$lib/api/school-client';
import { bootstrapSession } from '$lib/auth/bootstrap';
import { bootstrapAppShell, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { periodFitsInAcademicYear } from '$lib/onboarding/school-step-validation';
import { toast } from '$lib/toast.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';
import { get } from 'svelte/store';

export interface SubmitSchoolStepResult {
	schoolId: string;
	yearId: string;
	periodId: string;
}
function messageFromError(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.body && typeof error.body === 'object') {
			const body = error.body as Record<string, unknown>;
			if (body.code === 'ACADEMIC_PERIOD_OUTSIDE_YEAR') {
				return get(t)('onboarding.schoolStep.periodOutsideYear');
			}
			if (body.code === 'SUBJECT_ALREADY_LINKED') {
				return get(t)('onboarding.schoolStep.alreadyLinked');
			}
			if (typeof body.message === 'string') {
				return body.message;
			}
		}
	}
	return get(t)('onboarding.schoolStep.failed');
}
async function resolveSchoolId(
	school: OnboardingSchoolDraft,
): Promise<string | null> {
	resetAppShellBootstrap();
	let bootstrap = await bootstrapSession();
	if (bootstrap.session?.schoolId) {
		return bootstrap.session.schoolId;
	}
	if (authSession.schoolId) {
		return authSession.schoolId;
	}
	try {
		const registered = await getBrowserSchoolClient().onboarding.registerSchool({
			name: school.name.trim(),
			timeZone: school.timezone.trim(),
			city: school.city.trim(),
			country: school.country.trim(),
		});
		resetAppShellBootstrap();
		bootstrap = await bootstrapSession();
		return bootstrap.session?.schoolId ?? registered.id ?? null;
	}
	catch (error) {
		if (error instanceof ApiError && error.status === 409) {
			resetAppShellBootstrap();
			bootstrap = await bootstrapSession();
			return bootstrap.session?.schoolId ?? authSession.schoolId ?? null;
		}
		throw error;
	}
}
function periodsFitExistingYear(
	school: OnboardingSchoolDraft,
	yearStart: string,
	yearEnd: string,
): boolean {
	const yearStartDate = yearStart.slice(0, 10);
	const yearEndDate = yearEnd.slice(0, 10);
	return school.periods.every(period =>
		period.start >= yearStartDate
		&& period.end <= yearEndDate
		&& period.start <= period.end,
	);
}
async function ensureAcademicStructure(
	schoolId: string,
	school: OnboardingSchoolDraft,
): Promise<{ yearId: string; periodId: string }> {
	resetAppShellBootstrap();
	await bootstrapSession();
	configureBrowserSchoolClient({ getYearId: () => undefined });
	await bootstrapAppShell();
	const publishedPeriod = academicContext.publishedPeriods[0];
	if (publishedPeriod) {
		return {
			yearId: publishedPeriod.academicYearId,
			periodId: publishedPeriod.id,
		};
	}
	const draftPeriod = academicContext.periods.find(period => period.status === 'draft');
	if (draftPeriod) {
		const client = getBrowserSchoolClient();
		await client.commands.publishAcademicPeriod({ academicPeriodId: draftPeriod.id });
		return {
			yearId: draftPeriod.academicYearId,
			periodId: draftPeriod.id,
		};
	}
	const existingYear = academicContext.years[0];
	let yearId = existingYear?.id;
	if (existingYear) {
		if (!periodsFitExistingYear(school, existingYear.startDate, existingYear.endDate)) {
			toast.error(get(t)('onboarding.schoolStep.periodOutsideExistingYear'));
			throw new Error('period-outside-existing-year');
		}
	}
	else {
		if (!periodFitsInAcademicYear(school)) {
			toast.error(get(t)('onboarding.schoolStep.periodOutsideYear'));
			throw new Error('period-outside-year');
		}
		yearId = crypto.randomUUID();
	}
	const client = getBrowserSchoolClient();
	if (!existingYear && yearId) {
		await client.commands.createAcademicYear({
			id: yearId,
			schoolId,
			name: school.academicYearLabel.trim(),
			startDate: school.academicYearStart,
			endDate: school.academicYearEnd,
		});
	}
	let firstPeriodId = '';
	for (const [index, period] of school.periods.entries()) {
		const periodId = crypto.randomUUID();
		await client.commands.createAcademicPeriod({
			id: periodId,
			schoolId,
			academicYearId: yearId!,
			name: period.label.trim(),
			type: school.periodType,
			startDate: period.start,
			endDate: period.end,
			isPublished: false,
		});
		if (index === 0) {
			await client.commands.publishAcademicPeriod({ academicPeriodId: periodId });
			firstPeriodId = periodId;
		}
	}
	return { yearId: yearId!, periodId: firstPeriodId };
}
export async function submitSchoolOnboardingStep(
	school: OnboardingSchoolDraft,
	options: { alreadySubmitted: boolean; registeredSchoolId: string | null },
): Promise<SubmitSchoolStepResult | null> {
	if (!periodFitsInAcademicYear(school)) {
		toast.error(get(t)('onboarding.schoolStep.periodOutsideYear'));
		return null;
	}
	try {
		let schoolId = options.alreadySubmitted ? options.registeredSchoolId : null;
		if (!schoolId) {
			schoolId = await resolveSchoolId(school);
		}
		else {
			resetAppShellBootstrap();
			const bootstrap = await bootstrapSession();
			schoolId = bootstrap.session?.schoolId ?? schoolId;
		}
		if (!schoolId) {
			toast.error(get(t)('onboarding.schoolStep.sessionFailed'));
			return null;
		}
		const { yearId, periodId } = await ensureAcademicStructure(schoolId, school);
		resetAppShellBootstrap();
		await bootstrapSession();
		await bootstrapAppShell();
		toast.success(get(t)('onboarding.schoolStep.success'));
		return { schoolId, yearId, periodId };
	}
	catch (error) {
		if (error instanceof Error && error.message.startsWith('period-outside')) {
			return null;
		}
		toast.error(messageFromError(error));
		return null;
	}
}
export function readRegisteredSchoolId(): string | null {
	return authSession.schoolId;
}

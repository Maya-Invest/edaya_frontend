import type { OnboardingSchoolDraft } from '$lib/onboarding/types';
import { paginatedList } from '$lib/api/entity-list-filters';
import { configureBrowserSchoolClient, getBrowserSchoolClient } from '$lib/api/school-client';
import { bootstrapSession, resetBootstrapSession, type BootstrapSessionResult } from '$lib/auth/bootstrap';
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

async function refreshLinkedSchoolSession(maxAttempts = 6): Promise<BootstrapSessionResult> {
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		resetBootstrapSession();
		configureBrowserSchoolClient({ getYearId: () => undefined });
		const bootstrap = await bootstrapSession({ silent: true });
		if (bootstrap.session?.schoolId && authSession.isLoggedIn) {
			return bootstrap;
		}
		if (attempt < maxAttempts - 1) {
			await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
		}
	}
	return bootstrapSession({ silent: true });
}

async function resolveSchoolId(
	school: OnboardingSchoolDraft,
): Promise<string | null> {
	resetAppShellBootstrap();
	let bootstrap = await bootstrapSession({ silent: true });
	if (bootstrap.session?.schoolId) {
		return bootstrap.session.schoolId;
	}
	if (authSession.schoolId) {
		return authSession.schoolId;
	}
	configureBrowserSchoolClient({ getYearId: () => undefined });
	try {
		const registered = await getBrowserSchoolClient().onboarding.registerSchool({
			name: school.name.trim(),
			timeZone: school.timezone.trim(),
			city: school.city.trim(),
			country: school.country.trim(),
		});
		resetAppShellBootstrap();
		const linked = await refreshLinkedSchoolSession();
		return linked.session?.schoolId ?? authSession.schoolId ?? registered.id ?? null;
	}
	catch (error) {
		if (error instanceof ApiError && error.status === 409) {
			resetAppShellBootstrap();
			bootstrap = await refreshLinkedSchoolSession();
			return bootstrap.session?.schoolId ?? authSession.schoolId ?? null;
		}
		if (error instanceof ApiError && error.status === 503) {
			toast.error(get(t)('onboarding.schoolStep.failed'));
			return null;
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
async function safeOnboardingEntityList<T>(load: () => Promise<T[]>): Promise<T[]> {
	try {
		return await load();
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
			return [];
		}
		throw error;
	}
}

type OnboardingPeriodRow = {
	id: string;
	academicYearId: string;
	isPublished?: boolean;
};

/** Mirrors seeding: create then `publishAcademicPeriod` for each period. */
async function publishAcademicPeriodIfNeeded(
	client: ReturnType<typeof getBrowserSchoolClient>,
	academicPeriodId: string,
): Promise<void> {
	try {
		await client.commands.publishAcademicPeriod({ academicPeriodId });
	}
	catch (error) {
		if (error instanceof ApiError && error.status === 403) {
			return;
		}
		throw error;
	}
}

async function publishAllAcademicPeriods(
	client: ReturnType<typeof getBrowserSchoolClient>,
	periods: OnboardingPeriodRow[],
): Promise<void> {
	for (const period of periods) {
		if (!period.isPublished) {
			await publishAcademicPeriodIfNeeded(client, period.id);
		}
	}
}

async function resolveYearAndPeriodSelection(
	client: ReturnType<typeof getBrowserSchoolClient>,
	academicYearId: string,
): Promise<{ yearId: string; periodId: string }> {
	const periodsRaw = await safeOnboardingEntityList(() =>
		client.entities.academicPeriods.list(paginatedList({}, { limit: 50 })));
	const yearPeriods = periodsRaw.filter(period => period.academicYearId === academicYearId);
	if (yearPeriods.length === 0) {
		throw new Error('period-create-failed');
	}
	const activePeriod = yearPeriods.find(period => period.isPublished) ?? yearPeriods[0]!;
	return { yearId: academicYearId, periodId: activePeriod.id };
}

async function ensureAcademicStructure(
	school: OnboardingSchoolDraft,
): Promise<{ yearId: string; periodId: string }> {
	const schoolId = authSession.schoolId;
	if (!authSession.isLoggedIn || !schoolId) {
		throw new Error('session-not-linked');
	}

	configureBrowserSchoolClient({ getYearId: () => undefined });
	await refreshLinkedSchoolSession();
	if (!authSession.schoolId) {
		throw new Error('session-not-linked');
	}
	const linkedSchoolId = authSession.schoolId;
	const client = getBrowserSchoolClient();

	const [yearsRaw, periodsRaw] = await Promise.all([
		safeOnboardingEntityList(() =>
			client.entities.academicYears.list(paginatedList({}, { limit: 20 }))),
		safeOnboardingEntityList(() =>
			client.entities.academicPeriods.list(paginatedList({}, { limit: 50 }))),
	]);

	if (periodsRaw.length > 0) {
		const academicYearId = periodsRaw[0]!.academicYearId;
		const yearPeriods = periodsRaw.filter(period => period.academicYearId === academicYearId);
		await publishAllAcademicPeriods(client, yearPeriods);
		return resolveYearAndPeriodSelection(client, academicYearId);
	}

	const existingYear = yearsRaw[0];
	let yearId = existingYear?.id;
	if (existingYear) {
		const yearStart = typeof existingYear.startDate === 'string'
			? existingYear.startDate
			: String(existingYear.startDate);
		const yearEnd = typeof existingYear.endDate === 'string'
			? existingYear.endDate
			: String(existingYear.endDate);
		if (!periodsFitExistingYear(school, yearStart, yearEnd)) {
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
	if (!existingYear && yearId) {
		await client.commands.createAcademicYear({
			id: yearId,
			schoolId: linkedSchoolId,
			name: school.academicYearLabel.trim(),
			startDate: school.academicYearStart,
			endDate: school.academicYearEnd,
		});
	}
	const createdPeriodIds: string[] = [];
	for (const period of school.periods) {
		const periodId = crypto.randomUUID();
		await client.commands.createAcademicPeriod({
			id: periodId,
			schoolId: linkedSchoolId,
			academicYearId: yearId!,
			name: period.label.trim(),
			type: school.periodType,
			startDate: period.start,
			endDate: period.end,
			isPublished: false,
		});
		createdPeriodIds.push(periodId);
	}
	for (const periodId of createdPeriodIds) {
		await publishAcademicPeriodIfNeeded(client, periodId);
	}
	if (createdPeriodIds.length === 0) {
		throw new Error('period-create-failed');
	}
	return { yearId: yearId!, periodId: createdPeriodIds[0]! };
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
		let schoolId: string | null = null;
		if (!options.alreadySubmitted) {
			schoolId = await resolveSchoolId(school);
		}
		else {
			resetAppShellBootstrap();
			const bootstrap = await refreshLinkedSchoolSession();
			schoolId = bootstrap.session?.schoolId
				?? authSession.schoolId
				?? options.registeredSchoolId;
		}
		if (!schoolId) {
			toast.error(get(t)('onboarding.schoolStep.sessionFailed'));
			return null;
		}
		await refreshLinkedSchoolSession();
		if (!authSession.isLoggedIn || !authSession.schoolId) {
			toast.error(get(t)('onboarding.schoolStep.sessionFailed'));
			return null;
		}
		schoolId = authSession.schoolId;
		const { yearId, periodId } = await ensureAcademicStructure(school);
		toast.success(get(t)('onboarding.schoolStep.success'));
		return { schoolId, yearId, periodId };
	}
	catch (error) {
		if (error instanceof Error && error.message.startsWith('period-outside')) {
			return null;
		}
		if (error instanceof Error && error.message === 'session-not-linked') {
			toast.error(get(t)('onboarding.schoolStep.sessionFailed'));
			return null;
		}
		toast.error(messageFromError(error));
		return null;
	}
}
export function readRegisteredSchoolId(): string | null {
	return authSession.schoolId;
}

/** Loads shell data after step 1 without blocking the step transition UI. */
export function scheduleAppShellBootstrapAfterSchoolStep(): void {
	queueMicrotask(() => {
		void (async () => {
			resetAppShellBootstrap();
			await bootstrapSession({ silent: true });
			await bootstrapAppShell();
		})();
	});
}

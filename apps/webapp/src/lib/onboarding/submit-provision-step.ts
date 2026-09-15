import type { OnboardingDraft } from '$lib/onboarding/types';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { bootstrapSession, resetBootstrapSession } from '$lib/auth/bootstrap';
import { bootstrapAppShell, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { onboardingUserErrorMessage } from '$lib/onboarding/onboarding-user-error';
import { buildProvisionPayload } from '$lib/onboarding/provision-payload';
import {
	estimateProvisionPercent,
	mapServerPhaseToStepId,
} from '$lib/onboarding/provision-progress';
import { persistServerOnboardingStatusToDraft } from '$lib/onboarding/resume-onboarding';
import { markWizardCompletedInSession } from '$lib/onboarding/wizard-completion-flag';
import { toast } from '$lib/toast.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';
import { get } from 'svelte/store';

export { buildProvisionPayload } from '$lib/onboarding/provision-payload';

export interface ProvisionOnboardingResult {
	schoolId: string;
	yearId: string;
	periodId: string;
	phases: Array<{ phase: string; ms: number }>;
}

export interface ProvisionProgressState {
	phase: string;
	percent: number;
	activeStepId: string;
	completedIds: string[];
}

function failWithUserMessage(
	error: unknown,
	onError?: (message: string) => void,
): null {
	const message = onboardingUserErrorMessage(error, 'onboarding.completeStep.failed');
	onError?.(message);
	toast.error(message);
	return null;
}

function completedIdsFromPhases(phases: Array<{ phase: string }>): string[] {
	const ids: string[] = [];
	const seen = new Set<string>();
	for (const entry of phases) {
		const stepId = mapServerPhaseToStepId(entry.phase);
		if (!stepId || seen.has(stepId)) {
			continue;
		}
		seen.add(stepId);
		ids.push(stepId);
	}
	return ids;
}

function emitProgress(
	onProgress: ((state: ProvisionProgressState) => void) | undefined,
	state: ProvisionProgressState,
) {
	onProgress?.(state);
}

export async function submitProvisionOnboarding(
	draft: OnboardingDraft,
	options?: {
		successMessageKey?: 'onboarding.completeStep.success' | 'onboarding.skipWizardSuccess';
		onProgress?: (state: ProvisionProgressState) => void;
		onError?: (message: string) => void;
	},
): Promise<ProvisionOnboardingResult | null> {
	try {
		const payload = buildProvisionPayload(draft);
		const includeStaff = (payload.invites?.length ?? 0) > 0;
		const client = getBrowserSchoolClient();
		if (typeof client.onboarding.provision !== 'function') {
			console.error('[onboarding] client.onboarding.provision is missing — restart vite / clear .vite cache');
			return failWithUserMessage(null, options?.onError);
		}

		const waitStarted = performance.now();
		emitProgress(options?.onProgress, {
			phase: 'provision',
			...estimateProvisionPercent(0, includeStaff),
		});

		const progressInterval = setInterval(() => {
			emitProgress(options?.onProgress, {
				phase: 'provision',
				...estimateProvisionPercent(performance.now() - waitStarted, includeStaff),
			});
		}, 200);

		let result: Awaited<ReturnType<typeof client.onboarding.provision>>;
		try {
			result = await client.onboarding.provision(payload);
		}
		finally {
			clearInterval(progressInterval);
		}

		const completedIds = completedIdsFromPhases(result.phases);
		emitProgress(options?.onProgress, {
			phase: 'provision',
			percent: 90,
			activeStepId: 'bootstrap',
			completedIds,
		});

		authSession.setServerOnboardingStatus(result.status);
		if (authSession.authUserId) {
			markWizardCompletedInSession(authSession.authUserId);
		}

		emitProgress(options?.onProgress, {
			phase: 'bootstrap',
			percent: 94,
			activeStepId: 'bootstrap',
			completedIds,
		});

		resetBootstrapSession();
		resetAppShellBootstrap();
		await bootstrapSession({ silent: true });
		authSession.setServerOnboardingStatus(result.status);
		if (authSession.authUserId) {
			persistServerOnboardingStatusToDraft(
				authSession.authUserId,
				result.status,
				result.schoolId,
				{ holdLocalWizardCompleted: true },
			);
		}
		await bootstrapAppShell();

		emitProgress(options?.onProgress, {
			phase: 'bootstrap',
			percent: 100,
			activeStepId: 'bootstrap',
			completedIds: [...completedIds, 'bootstrap'],
		});

		const messageKey = options?.successMessageKey ?? 'onboarding.completeStep.success';
		toast.success(get(t)(messageKey));
		return {
			schoolId: result.schoolId,
			yearId: result.yearId,
			periodId: result.periodId,
			phases: result.phases,
		};
	}
	catch (error) {
		console.error(
			'[onboarding] provision failed',
			error,
			error instanceof ApiError ? error.body : undefined,
		);
		return failWithUserMessage(error, options?.onError);
	}
}

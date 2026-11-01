import type { OnboardingDraft } from '$lib/onboarding/types';
import { getBrowserSchoolClient } from '$lib/api/school-client';
import { bootstrapSession, resetBootstrapSession } from '$lib/auth/bootstrap';
import { bootstrapAppShell, resetAppShellBootstrap } from '$lib/auth/bootstrap-app';
import { authSession } from '$lib/auth/session.svelte';
import { t } from '$lib/i18n';
import { saveDraft } from '$lib/onboarding/draft-storage';
import { onboardingUserErrorMessage } from '$lib/onboarding/onboarding-user-error';
import {
	loadProvisionAttempt,
	markProvisionAttemptBootstrapReady,
	markProvisionAttemptCommitted,
	normalizeProvisionFingerprint,
	provisionAttemptNeedsReconciliation,
	resolveProvisionAttempt,
} from '$lib/onboarding/provision-attempt';
import { buildProvisionPayload, restoreProvisionedDraft } from '$lib/onboarding/provision-payload';
import {
	estimateProvisionPercent,
	mapServerPhaseToStepId,
} from '$lib/onboarding/provision-progress';
import { persistServerOnboardingStatusToDraft } from '$lib/onboarding/resume-onboarding';
import { markOnboardingSummaryHold } from '$lib/onboarding/wizard-completion-flag';
import { toast } from '$lib/toast.svelte';
import { ApiError } from '@maya-invest/edaya-api-client';
import { get } from 'svelte/store';

export { buildProvisionPayload } from '$lib/onboarding/provision-payload';

export interface ProvisionOnboardingResult {
	schoolId: string;
	yearId: string;
	periodId: string;
	phases: Array<{ phase: string; ms: number }>;
	replayed?: boolean;
	bootstrapFailed?: boolean;
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

export async function refreshSessionAfterProvision(options?: {
	onProgress?: (state: ProvisionProgressState) => void;
	onError?: (message: string) => void;
	completedIds?: string[];
}): Promise<boolean> {
	const completedIds = options?.completedIds ?? [];
	emitProgress(options?.onProgress, {
		phase: 'bootstrap',
		percent: 94,
		activeStepId: 'bootstrap',
		completedIds,
	});

	try {
		resetBootstrapSession();
		resetAppShellBootstrap();
		await bootstrapSession({ silent: true });
		if (!authSession.isLoggedIn) {
			throw new Error('bootstrap-unlinked');
		}
		if (authSession.authUserId && authSession.serverOnboardingStatus) {
			persistServerOnboardingStatusToDraft(
				authSession.authUserId,
				authSession.serverOnboardingStatus,
				authSession.schoolId,
				{ holdLocalWizardCompleted: true },
			);
		}
		await bootstrapAppShell();
		if (authSession.authUserId) {
			markProvisionAttemptBootstrapReady(authSession.authUserId);
		}
		emitProgress(options?.onProgress, {
			phase: 'bootstrap',
			percent: 100,
			activeStepId: 'bootstrap',
			completedIds: [...completedIds, 'bootstrap'],
		});
		return true;
	}
	catch (error) {
		console.error('[onboarding] bootstrap after provision failed', error);
		const message = onboardingUserErrorMessage(error, 'onboarding.completeStep.redirectFailed');
		options?.onError?.(message);
		toast.error(message);
		return false;
	}
}

export async function submitProvisionOnboarding(
	draft: OnboardingDraft,
	options?: {
		successMessageKey?: 'onboarding.completeStep.success' | 'onboarding.skipWizardSuccess';
		onProgress?: (state: ProvisionProgressState) => void;
		onError?: (message: string) => void;
	},
): Promise<ProvisionOnboardingResult | null> {
	const authUserId = authSession.authUserId;
	if (!authUserId) {
		return failWithUserMessage(null, options?.onError);
	}

	try {
		let payload = buildProvisionPayload(draft);
		let reconciled = false;
		if (provisionAttemptNeedsReconciliation(authUserId, draft)) {
			// Resolve a lost response before replacing its request identity. Errors keep the attempt intact.
			resetBootstrapSession();
			const bootstrap = await bootstrapSession({ silent: true });
			const previous = loadProvisionAttempt(authUserId)!;
			if (bootstrap.session?.schoolId === previous.schoolId) {
				markProvisionAttemptCommitted(authUserId, previous.schoolId);
				// Replay the original request to recover its authoritative year/period and result.
				const original = JSON.parse(normalizeProvisionFingerprint(previous.fingerprint)) as typeof payload;
				payload = original;
				restoreProvisionedDraft(draft, original);
				saveDraft(authUserId, draft);
			}
			else if (bootstrap.pendingOnboarding) {
				reconciled = true;
			}
			else {
				throw new Error('ONBOARDING_ATTEMPT_RECONCILIATION_REQUIRED');
			}
		}
		const attempt = resolveProvisionAttempt(authUserId, draft, reconciled);
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
			result = await client.onboarding.provision({
				...payload,
				schoolId: attempt.schoolId,
				requestId: attempt.requestId,
			});
		}
		finally {
			clearInterval(progressInterval);
		}

		markProvisionAttemptCommitted(authUserId, result.schoolId);
		const completedIds = completedIdsFromPhases(result.phases);
		emitProgress(options?.onProgress, {
			phase: 'provision',
			percent: 90,
			activeStepId: 'bootstrap',
			completedIds,
		});

		authSession.setServerOnboardingStatus(result.status);
		markOnboardingSummaryHold(authUserId);
		persistServerOnboardingStatusToDraft(
			authUserId,
			result.status,
			result.schoolId,
			{ holdLocalWizardCompleted: true },
		);

		const bootstrapped = await refreshSessionAfterProvision({
			onProgress: options?.onProgress,
			onError: options?.onError,
			completedIds,
		});
		authSession.setServerOnboardingStatus(result.status);

		if (bootstrapped) {
			const messageKey = options?.successMessageKey ?? 'onboarding.completeStep.success';
			toast.success(get(t)(messageKey));
		}

		return {
			schoolId: result.schoolId,
			yearId: result.yearId,
			periodId: result.periodId,
			phases: result.phases,
			replayed: result.replayed,
			bootstrapFailed: !bootstrapped,
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

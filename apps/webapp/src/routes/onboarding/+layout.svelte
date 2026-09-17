<script lang="ts">
	import type { Snippet } from 'svelte';
	import { shouldEnforceLoginGate } from '$lib/auth/enforce-login-gate';
	import { redirectPathIfAuthenticated } from '$lib/auth/resolve-post-auth';
	import { authSession } from '$lib/auth/session.svelte';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import { LoaderCircle } from '$lib/icons';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { onboardingContext } from '$lib/onboarding/context.svelte';
	import { shouldContinueOnboarding } from '$lib/onboarding/resume-onboarding';
	import { isOnboardingSummaryHold } from '$lib/onboarding/wizard-completion-flag';

	const { children }: { children: Snippet } = $props();

	const showOnboardingShell = $derived.by(() => {
		if (!authSession.ready || !authSession.hasAuthAccount) {
			return false;
		}
		if (authSession.needsOnboarding) {
			return true;
		}
		if (
			authSession.isLoggedIn
			&& !shouldContinueOnboarding(
				authSession.authUserId,
				authSession.schoolId,
				authSession.serverOnboardingStatus,
			)
			&& !isOnboardingSummaryHold(authSession.authUserId)
		) {
			return false;
		}
		return onboardingContext.initialized && (
			!onboardingContext.draft.wizardCompleted
			|| isOnboardingSummaryHold(authSession.authUserId)
		);
	});

	$effect(() => {
		if (!authSession.ready) {
			return;
		}

		if (shouldEnforceLoginGate()) {
			appGoto(appPath('/login'), { replaceState: true });
			return;
		}

		if (!authSession.hasAuthAccount) {
			appGoto(appPath('/login'), { replaceState: true });
			return;
		}

		const authUserId = authSession.authUserId;
		if (authUserId) {
			onboardingContext.init(authUserId);
		}
	});

	$effect(() => {
		if (!authSession.ready || !onboardingContext.initialized) {
			return;
		}

		if (
			authSession.isLoggedIn
			&& !isOnboardingSummaryHold(authSession.authUserId)
			&& !shouldContinueOnboarding(
				authSession.authUserId,
				authSession.schoolId,
				authSession.serverOnboardingStatus,
			)
		) {
			const target = redirectPathIfAuthenticated();
			if (target) {
				appGoto(target, { replaceState: true });
			}
		}
	});
</script>

{#if !authSession.ready && !authSession.hasAuthAccount}
	<div
		class="flex min-h-screen items-center justify-center bg-background text-foreground"
		data-onboarding-shell
	>
		<LoaderCircle class="h-8 w-8 animate-spin text-primary" />
	</div>
{:else if showOnboardingShell}
	<div class="flex min-h-screen flex-col bg-background text-foreground" data-onboarding-shell>
		<header class="flex items-center justify-between px-4 py-3 sm:px-6">
			<div class="flex items-center gap-2">
				<BrandLogo variant="horizontal" width={144} />
			</div>
			<LanguageSelector />
		</header>

		<main class="flex flex-1 flex-col">
			{@render children()}
		</main>
	</div>
{:else}
	<div
		class="flex min-h-screen items-center justify-center bg-background text-foreground"
		data-onboarding-shell
	>
		<LoaderCircle class="h-8 w-8 animate-spin text-primary" />
	</div>
{/if}

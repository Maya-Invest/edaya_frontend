<script lang="ts">
	import type { Snippet } from 'svelte';
	import { shouldEnforceLoginGate } from '$lib/auth/enforce-login-gate';
	import { redirectPathIfAuthenticated } from '$lib/auth/resolve-post-auth';
	import { authSession } from '$lib/auth/session.svelte';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import { GraduationCap, LoaderCircle } from '$lib/icons';
	import { appGoto, appPath } from '$lib/navigation/app-navigation';
	import { onboardingContext } from '$lib/onboarding/context.svelte';

	const { children }: { children: Snippet } = $props();

	const showOnboardingShell = $derived.by(() => {
		if (!authSession.ready || !authSession.hasAuthAccount) {
			return false;
		}
		if (authSession.needsOnboarding) {
			return true;
		}
		return onboardingContext.initialized && !onboardingContext.draft.wizardCompleted;
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

		if (authSession.isLoggedIn && onboardingContext.draft.wizardCompleted) {
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
				<div
					class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-panel"
				>
					<GraduationCap class="h-4 w-4" />
				</div>
				<div class="hidden sm:block">
					<p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">EDAYA</p>
				</div>
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

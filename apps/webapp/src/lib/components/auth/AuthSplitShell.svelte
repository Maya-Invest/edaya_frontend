<script lang="ts">
	import type { Snippet } from 'svelte';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import { t } from '$lib/i18n';
	import { GraduationCap } from '$lib/icons';
	import { cn } from '$lib/utils';

	export type AuthSplitPanel = 'signup' | 'signin';

	interface Props {
		activePanel: AuthSplitPanel;
		onPanelChange: (panel: AuthSplitPanel) => void;
		showSignup?: boolean;
		signup: Snippet;
		signin: Snippet;
		footer?: Snippet;
	}

	const {
		activePanel,
		onPanelChange,
		showSignup = true,
		signup,
		signin,
		footer,
	}: Props = $props();

	const panelButtonClass = (panel: AuthSplitPanel) => cn(
		'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
		activePanel === panel
			? 'bg-primary text-primary-foreground shadow-soft'
			: 'text-muted-foreground hover:text-foreground',
	);
</script>

<div class="flex min-h-screen flex-col bg-background text-foreground">
	<header class="flex items-center justify-end px-4 py-3 sm:px-6">
		<LanguageSelector />
	</header>

	<main class="flex flex-1 items-center justify-center px-4 pb-8 pt-2 sm:px-6">
		<div class={cn('w-full animate-fade-in', showSignup ? 'max-w-3xl' : 'max-w-md')}>
			<div class="mb-5 flex flex-col items-center text-center">
				<div
					class="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-panel"
				>
					<GraduationCap class="h-5 w-5" />
				</div>
				<p class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">EDAYA</p>
			</div>

			<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-panel">
				{#if showSignup}
					<div class="border-b border-border bg-secondary/40 p-1.5 md:hidden">
						<div class="flex gap-1 rounded-lg bg-background/80 p-1">
							<button type="button" class={panelButtonClass('signup')} onclick={() => onPanelChange('signup')}>
								{$t('auth.tabSignUp')}
							</button>
							<button type="button" class={panelButtonClass('signin')} onclick={() => onPanelChange('signin')}>
								{$t('auth.tabSignIn')}
							</button>
						</div>
					</div>

					<div class="flex flex-col md:flex-row md:min-h-[28rem]">
						<section
							class={cn(
								'flex flex-col justify-center bg-primary p-5 text-primary-foreground sm:p-6 md:w-[44%]',
								activePanel !== 'signup' && 'hidden md:flex',
							)}
						>
							<div class="mb-4 hidden md:block">
								<h1 class="font-display text-xl font-semibold leading-snug">
									{$t('auth.signUpPanelTitle')}
								</h1>
								<p class="mt-2 text-xs leading-relaxed text-primary-foreground/85">
									{$t('auth.signUpPanelDescription')}
								</p>
							</div>

							<div class="md:hidden">
								<h2 class="font-display text-lg font-semibold">{$t('auth.signUpTitle')}</h2>
								<p class="mt-1 text-xs text-primary-foreground/85">{$t('auth.signUpSubtitle')}</p>
							</div>

							<div class="mt-4 md:mt-0">
								{@render signup()}
							</div>

							<p class="mt-4 text-center text-xs md:hidden">
								{$t('auth.alreadyHaveAccount')}
								<button
									type="button"
									class="ml-1 font-medium underline underline-offset-2"
									onclick={() => onPanelChange('signin')}
								>
									{$t('auth.switchToSignIn')}
								</button>
							</p>
						</section>

						<section
							class={cn(
								'flex flex-col justify-center border-border p-5 sm:p-6 md:w-[56%] md:border-l',
								activePanel !== 'signin' && 'hidden md:flex',
							)}
						>
							<div class="mb-4 text-center md:text-left">
								<h2 class="font-display text-xl font-semibold">{$t('auth.welcome')}</h2>
								<p class="mt-1 text-xs text-muted-foreground">{$t('auth.subtitle')}</p>
							</div>

							{@render signin()}

							<p class="mt-4 text-center text-xs md:text-left">
								{$t('auth.noAccountYet')}
								<button
									type="button"
									class="ml-1 font-medium text-primary hover:underline"
									onclick={() => onPanelChange('signup')}
								>
									{$t('auth.switchToSignUp')}
								</button>
							</p>
						</section>
					</div>
				{:else}
					<section class="flex flex-col justify-center p-5 sm:p-6">
						<div class="mb-4 text-center">
							<h2 class="font-display text-xl font-semibold">{$t('auth.welcome')}</h2>
							<p class="mt-1 text-xs text-muted-foreground">{$t('auth.subtitle')}</p>
						</div>

						{@render signin()}
					</section>
				{/if}
			</div>

			{#if footer}
				<div class="mt-5 text-center text-xs">
					{@render footer()}
				</div>
			{/if}
		</div>
	</main>
</div>

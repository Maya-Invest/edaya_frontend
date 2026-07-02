<script lang="ts">
	import { t } from '$lib/i18n';
	import { CheckCircle2 } from '$lib/icons';
	import { ONBOARDING_COMPLETE_CHECKLIST } from '$lib/onboarding/complete-step-checklist';
</script>

<div class="space-y-6">
	<section class="rounded-xl border border-border bg-secondary/20 px-4 py-5 text-center">
		<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
			<CheckCircle2 class="h-6 w-6" />
		</div>
		<h2 class="text-lg font-semibold text-foreground">
			{$t('onboarding.complete.readyTitle')}
		</h2>
		<p class="mt-2 text-sm text-muted-foreground">
			{$t('onboarding.complete.readyBody')}
		</p>
	</section>

	<section class="space-y-3">
		<h3 class="text-sm font-medium text-foreground">
			{$t('onboarding.complete.checklistTitle')}
		</h3>
		<ul class="space-y-2">
			{#each ONBOARDING_COMPLETE_CHECKLIST as item (item.labelKey)}
				<li>
					<a
						href={item.href}
						class="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-secondary/40"
					>
						<span>{$t(item.labelKey)}</span>
						<span class="text-xs text-muted-foreground">{$t('onboarding.complete.checklistOpen')}</span>
					</a>
				</li>
			{/each}
		</ul>
		<p class="text-xs text-muted-foreground">
			{$t('onboarding.complete.checklistHint')}
		</p>
	</section>
</div>

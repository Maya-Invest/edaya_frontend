<script lang="ts">
	import type { CatalogSubject } from '$lib/onboarding/dataset-model';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DrawerFrame from '$lib/components/ui/DrawerFrame.svelte';
	import { lang, t } from '$lib/i18n';
	import { catalogMatter } from '$lib/i18n/catalog-label';
	import { X } from '$lib/icons';

	const {
		open,
		levelCode,
		subjectCode,
		subjectName,
		matters,
		subject,
		onClose,
	}: {
		open: boolean;
		levelCode: string;
		subjectCode: string;
		subjectName: string;
		matters: string[];
		subject?: CatalogSubject;
		onClose: () => void;
	} = $props();

	const name = $derived(
		subjectCode.trim() === subjectName.trim() ? subjectName : `${subjectCode} — ${subjectName}`,
	);

	const codeInitials = $derived(subjectCode.trim().slice(0, 4).toUpperCase());

</script>

<!-- Closing this read-only preview preserves the onboarding draft. -->
<DrawerFrame {open} {onClose} label={$t('config.subjects')} guardDirtyWork={false} testId="onboarding-subject-drawer">
	<header class="flex items-center justify-between border-b border-border px-6 py-4">
		<span class="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-foreground/80">
			{$t('config.subjects')}
		</span>
		<Button variant="ghost" size="icon" onclick={onClose} aria-label={$t('common.close')}>
			<X class="h-4 w-4" />
		</Button>
	</header>

	<div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-6 py-6">
		<div class="space-y-5">
			<DrawerEntityHeader {name} summary={levelCode}>
				{#snippet chips()}
					<span class="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground/80">
						{$t('subjects.chapters.sectionTitle', { count: matters.length })}
					</span>
				{/snippet}
				{#snippet avatar()}
					<span
						class="flex h-14 w-14 items-center justify-center rounded-collection bg-primary font-display text-sm font-semibold text-primary-foreground"
					>
						{codeInitials}
					</span>
				{/snippet}
			</DrawerEntityHeader>

			{#if subject}
				<dl class="grid grid-cols-2 gap-3 text-sm">
					<dt>{$t('onboarding.dataset.discipline')}</dt><dd>{subject.disciplineName}</dd>
					<dt>{$t('onboarding.dataset.category')}</dt><dd>{subject.categoryName}</dd>
					<dt>{$t('onboarding.dataset.coefficient')}</dt><dd>{subject.coefficient}</dd>
					<dt>{$t('onboarding.dataset.subjectType')}</dt><dd>{$t(subject.isOptional ? 'onboarding.dataset.optional' : 'onboarding.dataset.required')}</dd>
				</dl>
			{/if}
			<section class="space-y-2">
				<p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
					{$t('subjects.chapters.configured')}
				</p>
				{#each matters as matter, index (`${index}-${matter}`)}
					<div class="rounded-collection border border-border bg-card px-4 py-3 shadow-soft">
						<p class="text-sm font-semibold">{catalogMatter(matter, $lang)}</p>
					</div>
				{:else}
					<p class="rounded-collection border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
						{$t('subjects.chapters.emptyCatalog')}
					</p>
				{/each}
			</section>
		</div>
	</div>
</DrawerFrame>

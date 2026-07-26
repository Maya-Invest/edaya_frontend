<script lang="ts">
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import { t } from '$lib/i18n';
	import { X } from '$lib/icons';

	const {
		open,
		levelCode,
		subjectCode,
		subjectName,
		matters,
		onClose,
	}: {
		open: boolean;
		levelCode: string;
		subjectCode: string;
		subjectName: string;
		matters: string[];
		onClose: () => void;
	} = $props();

	const name = $derived(
		subjectCode.trim() === subjectName.trim() ? subjectName : `${subjectCode} — ${subjectName}`,
	);

	const codeInitials = $derived(subjectCode.trim().slice(0, 4).toUpperCase());

	function handleKeydown(event: KeyboardEvent) {
		if (!open || event.key !== 'Escape') {
			return;
		}
		onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		role="presentation"
		onclick={onClose}
		class="fixed inset-0 z-40 bg-primary/5 motion-safe:animate-fade-in"
	></div>
	<aside
		class="fixed right-0 top-0 z-50 flex h-full w-full flex-col overflow-hidden border-l border-border bg-card shadow-panel motion-safe:animate-slide-in-right md:w-1/2"
		aria-label={$t('config.subjects')}
	>
		<header class="flex items-center justify-between border-b border-border px-6 py-4">
			<span class="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-foreground/80">
				{$t('config.subjects')}
			</span>
			<button
				type="button"
				onclick={onClose}
				class="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
			>
				<X class="h-4 w-4" />
			</button>
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
							class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary font-display text-sm font-semibold text-primary-foreground"
						>
							{codeInitials}
						</span>
					{/snippet}
				</DrawerEntityHeader>

				<section class="space-y-2">
					<p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('subjects.chapters.configured')}
					</p>
					{#each matters as matter, index (`${index}-${matter}`)}
						<div class="rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
							<p class="text-sm font-semibold">{matter}</p>
						</div>
					{:else}
						<p class="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
							{$t('subjects.chapters.emptyCatalog')}
						</p>
					{/each}
				</section>
			</div>
		</div>
	</aside>
{/if}

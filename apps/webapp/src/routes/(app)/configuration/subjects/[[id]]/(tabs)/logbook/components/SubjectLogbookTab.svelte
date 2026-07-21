<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { t } from '$lib/i18n';
	import { Check, FileText, Paperclip } from '$lib/icons';
	import { getSubjectsPageState } from '../../../../subjects-page.svelte';

	const { subject }: { subject: Subject } = $props();

	const subjectsPage = getSubjectsPageState();
	const entries = $derived(subjectsPage.logEntriesForSubject(subject));
</script>

<div class="space-y-3">
	{#each entries as entry (entry.id)}
		<article class="rounded-2xl border border-border bg-card p-4 shadow-soft">
			<header class="mb-2 flex items-start justify-between gap-2">
				<div>
					<p class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
						{new Date(entry.date).toLocaleDateString('fr-FR', {
							weekday: 'short',
							day: '2-digit',
							month: 'short',
							year: 'numeric',
						})}
					</p>
					<h4 class="mt-0.5 font-display text-sm font-semibold">{entry.chapter}</h4>
				</div>
				<span class="font-mono text-[10px] text-muted-foreground">{entry.progress}%</span>
			</header>
			<p class="text-xs leading-relaxed text-foreground/80">{entry.content}</p>
			{#if entry.objectives.length > 0}
				<ul class="mt-2 space-y-1">
					{#each entry.objectives as objective (objective)}
						<li class="flex items-start gap-1.5 text-[11px]">
							<Check class="mt-0.5 h-3 w-3 text-accent" />
							{objective}
						</li>
					{/each}
				</ul>
			{/if}
			{#if entry.homework || entry.attachments?.length}
				<div class="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[11px]">
					{#if entry.homework}
						<span class="flex items-center gap-1 text-muted-foreground">
							<FileText class="h-3 w-3" />
							<span class="font-medium text-foreground">{$t('teaching.homework')} :</span>
							{entry.homework}
						</span>
					{/if}
					{#each entry.attachments ?? [] as attachment (attachment)}
						<span
							class="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground"
						>
							<Paperclip class="h-3 w-3" />
							{attachment}
						</span>
					{/each}
				</div>
			{/if}
		</article>
	{:else}
		<p class="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
			{$t('teaching.empty')}
		</p>
	{/each}
</div>

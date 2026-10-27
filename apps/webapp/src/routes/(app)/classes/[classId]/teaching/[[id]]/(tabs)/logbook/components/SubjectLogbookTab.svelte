<script lang="ts">
	import type { Subject } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import AcademicPeriodSelector from '$lib/components/layout/AcademicPeriodSelector.svelte';
	import DocumentPdfButton from '$lib/components/school/documents/DocumentPdfButton.svelte';
	import { t } from '$lib/i18n';
	import { Paperclip } from '$lib/icons';
	import { getTeachingPageState } from '../../../../teaching-page.svelte';

	const { subject }: { subject: Subject } = $props();

	const teachingPage = getTeachingPageState();
	const entries = $derived(teachingPage.logEntriesForSubject(subject));
	const classId = $derived(subject.classId);
</script>

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-3">
		<AcademicPeriodSelector />
		<DocumentPdfButton onRequestDocumentIssuance={teachingPage.performRequestDocumentIssuance}
			disabled={!academicContext.periodId}
			templateKey="logbook.v1"
			sourceId={classId}
			classGroupId={classId}
			classSubjectId={subject.id}
			academicPeriodId={academicContext.periodId}
			permission="CLASS_LOGBOOK_READ"
			classId={classId}
			label={$t('documents.exportLogbook')}
		/>
	</div>
	{#each entries as entry (entry.id)}
		<article class="rounded-collection border border-border bg-card p-4 shadow-soft">
			<header class="mb-2 flex items-start justify-between gap-2">
				<div>
					<p class="font-sans tabular-nums text-[10px] uppercase tracking-wider text-muted-foreground">
						{new Date(entry.date).toLocaleDateString('fr-FR', {
							weekday: 'short',
							day: '2-digit',
							month: 'short',
							year: 'numeric',
						})}
					</p>
					<h4 class="mt-0.5 font-display text-sm font-semibold">{entry.chapter}</h4>
				</div>
				<span class="font-sans tabular-nums text-[10px] text-muted-foreground">{entry.progress}%</span>
			</header>
			<p class="text-xs leading-relaxed text-foreground/80">{entry.content}</p>
			{#if entry.notes.trim().length > 0}
				<p class="mt-2 text-[11px] text-muted-foreground">
					<span class="font-medium text-foreground">{$t('teaching.notes')} :</span>
					{entry.notes}
				</p>
			{/if}
			{#if entry.attachments?.length}
				<div class="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[11px]">
					{#each entry.attachments as attachment (attachment)}
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
		<p class="rounded-collection border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
			{$t('teaching.empty')}
		</p>
	{/each}
</div>

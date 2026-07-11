<script lang="ts">
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { Users } from '$lib/icons';
	import { appPath } from '$lib/navigation/app-navigation';
	import { cn } from '$lib/utils';
	import StudentImportModal from './StudentImportModal.svelte';

	let studentImportOpen = $state(false);

	const hasClasses = $derived(academicContext.classes.length > 0);
	const classesHref = appPath('/(app)/configuration/classes/[[id]]');
</script>

<ListPageHeader
	eyebrow={$t('import.eyebrow')}
	title={$t('import.title')}
	description={$t('import.description')}
/>

<div class="mb-6 rounded-xl border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
	{$t('import.recommendedOrder')}
</div>

<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
	<article
		class={cn(
			'flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm',
			!hasClasses && 'opacity-80',
		)}
		data-testid="import-pack-students"
	>
		<div class="mb-4 flex items-start gap-3">
			<div class="rounded-lg bg-primary/10 p-2 text-primary">
				<Users class="size-5" aria-hidden="true" />
			</div>
			<div class="min-w-0 flex-1">
				<h3 class="font-display text-lg font-semibold">{$t('import.students.title')}</h3>
				<p class="mt-1 text-sm text-muted-foreground">{$t('import.students.description')}</p>
			</div>
		</div>

		<dl class="mb-5 space-y-2 text-sm">
			<div>
				<dt class="font-medium text-foreground">{$t('import.students.prerequisite')}</dt>
				<dd class="text-muted-foreground">
					{#if hasClasses}
						<span class="text-emerald-600 dark:text-emerald-400">✓</span>
						{$t('import.students.classCount', { n: academicContext.classes.length })}
					{:else}
						{$t('import.students.prerequisiteMissing')}
					{/if}
				</dd>
			</div>
			<div>
				<dt class="font-medium text-foreground">{$t('import.formats')}</dt>
			</div>
		</dl>

		<div class="mt-auto flex flex-wrap items-center gap-2">
			{#if !hasClasses}
				<Button variant="outline" href={classesHref}>
					{$t('import.students.configureClasses')}
				</Button>
			{/if}

			<PermissionGate
				permission="STUDENT_CREATE"
				mode="disable"
				tooltip={$t('import.students.permission')}
			>
				{#snippet children({ disabled, title })}
					<Button
						disabled={disabled || !hasClasses}
						title={title}
						onclick={() => (studentImportOpen = true)}
						data-testid="import-students-action"
					>
						{$t('import.students.action')}
					</Button>
				{/snippet}
			</PermissionGate>
		</div>
	</article>
</div>

<StudentImportModal bind:open={studentImportOpen} />

<script lang="ts">
	import DataImportModal from '$lib/components/school/configuration/DataImportModal.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { t } from '$lib/i18n';
	import { CalendarRange, Upload } from '$lib/icons';
	import { getToolsPageState } from '../tools-page.svelte';
	import SchoolTimetableGenerationModal from './SchoolTimetableGenerationModal.svelte';

	const toolsPage = getToolsPageState();
</script>

<ListPageHeader
	eyebrow={$t('tools.eyebrow')}
	title={$t('tools.title')}
	description={$t('tools.description')}
/>

<div class="grid gap-4 md:grid-cols-2 xl:max-w-4xl">
	<article
		class="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm"
		data-testid="import-pack-generic"
	>
		<div class="mb-4 flex items-start gap-3">
			<div class="rounded-lg bg-primary/10 p-2 text-primary">
				<Upload class="size-5" aria-hidden="true" />
			</div>
			<div class="min-w-0 flex-1">
				<h3 class="font-display text-lg font-semibold">{$t('import.card.title')}</h3>
				<p class="mt-1 text-sm text-muted-foreground">{$t('import.card.description')}</p>
				<p class="mt-2 text-sm text-muted-foreground">{$t('import.recommendedOrder')}</p>
			</div>
		</div>

		<dl class="mb-5 space-y-2 text-sm">
			<div>
				<dt class="font-medium text-foreground">{$t('import.formats')}</dt>
			</div>
		</dl>

		<div class="mt-auto">
			<Button onclick={() => (toolsPage.importModalOpen = true)} data-testid="import-action">
				{$t('import.card.action')}
			</Button>
		</div>
	</article>

	<PermissionGate permission="TIMETABLE_UPDATE" mode="hide">
		<article
			class="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm"
			data-testid="timetable-planning-tool"
		>
			<div class="mb-4 flex items-start gap-3">
				<div class="rounded-lg bg-primary/10 p-2 text-primary">
					<CalendarRange class="size-5" aria-hidden="true" />
				</div>
				<div class="min-w-0 flex-1">
					<h3 class="font-display text-lg font-semibold">{$t('tools.timetablePlanning.card.title')}</h3>
					<p class="mt-1 text-sm text-muted-foreground">{$t('tools.timetablePlanning.card.description')}</p>
				</div>
			</div>

			<div class="mt-auto">
				<Button onclick={() => (toolsPage.timetablePlanningModalOpen = true)} data-testid="timetable-planning-action">
					{$t('tools.timetablePlanning.card.action')}
				</Button>
			</div>
		</article>
	</PermissionGate>
</div>

<DataImportModal bind:open={toolsPage.importModalOpen} />
<SchoolTimetableGenerationModal bind:open={toolsPage.timetablePlanningModalOpen} state={toolsPage.planningPage} />

<script lang="ts">
	import type { ImportTypeKey } from '$lib/import/catalog/types';
	import type { ImportMode } from '../import-state.svelte';
	import { academicContext } from '$lib/academic/context.svelte';
	import { authSession } from '$lib/auth/session.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import { t } from '$lib/i18n';
	import { IMPORT_TYPE_DEFINITIONS } from '$lib/import/catalog/import-types';
	import { untrack } from 'svelte';
	import { getToolsPageState } from '../tools-page.svelte';

	let { open = $bindable(false), importType = 'students', onImportTypeChange }: {
		open?: boolean;
		step?: string;
		importType?: ImportTypeKey;
		onStepChange?: (step: string) => void;
		onImportTypeChange?: (type: ImportTypeKey) => void;
		onInvalidStep?: (step: string) => void;
	} = $props();
	const page = getToolsPageState();
	const importState = page.importState;
	let yearId = $state('');
	let mode = $state<ImportMode>('M');
	let effectiveDate = $state('');
	let selectedFiles = $state<FileList>();
	let replacementId = $state('');
	let pageIndex = $state(0);
	let outcomeFilter = $state('');
	let displayedBatchId: string | undefined;
	const definitions = $derived(IMPORT_TYPE_DEFINITIONS.filter(item => page.allowedImportTabs.includes(item.key)));
	const files = $derived([...new Map(importState.detail?.files.map(file => [file.fileId, file]) ?? []).values()]);
	const rows = $derived((importState.detail?.rows ?? []).filter(row => !outcomeFilter || row.outcome === outcomeFilter));
	const visiblePageIndex = $derived(Math.min(pageIndex, Math.max(0, Math.ceil(rows.length / 50) - 1)));
	const visibleRows = $derived(rows.slice(visiblePageIndex * 50, (visiblePageIndex + 1) * 50));
	const running = $derived(importState.detail?.batch.state === 'running');
	const ready = $derived(importState.detail?.rows.filter(row => row.outcome === 'pending').length ?? 0);
	const settingsDirty = $derived(Boolean(importState.detail && (mode !== importState.detail.batch.defaultOnExisting || effectiveDate !== (importState.detail.batch.enrollmentEffectiveDate ?? ''))));
	const typeLabel = (type: string) => $t(IMPORT_TYPE_DEFINITIONS.find(item => item.key === type)?.labelKey ?? type);
	const display = (value: unknown) => value === undefined ? $t('durableImport.omitted') : value === null ? $t('durableImport.blank') : typeof value === 'object' ? JSON.stringify(value) : String(value);

	$effect(() => {
		const scope = `${authSession.schoolId}:${authSession.subjectId}`;
		if (!scope || !open) {
			importState.disconnect();
			return;
		}
		const batchId = page.modals.target;
		untrack(() => {
			void importState.connect(batchId, scope);
		});
		return () => importState.disconnect();
	});
	$effect(() => {
		const batch = importState.detail?.batch;
		yearId = batch?.academicYearId ?? academicContext.yearId;
		mode = batch?.defaultOnExisting ?? 'M';
		effectiveDate = batch?.enrollmentEffectiveDate ?? '';
	});
	$effect(() => {
		const batchId = importState.detail?.batch.id;
		if (batchId !== displayedBatchId) {
			displayedBatchId = batchId;
			selectedFiles = undefined;
			replacementId = '';
			pageIndex = 0;
			outcomeFilter = '';
		}
	});

	async function create() {
		const batch = await importState.create(yearId, mode, effectiveDate);
		if (batch)
			page.selectImportBatch(batch.id);
	}
	async function upload() {
		if (!selectedFiles?.length)
			return;
		for (const file of Array.from(selectedFiles)) {
			const type = replacementId ? files.find(file => file.fileId === replacementId)!.type : importType;
			if (!await importState.submit(file, type, replacementId || undefined))
				return;
		}
		selectedFiles = undefined;
		replacementId = '';
	}
</script>

<FormModal bind:open title={$t('durableImport.title')} description={$t('durableImport.description')} contentClass="max-w-6xl" onSubmit={() => {}}>
	<div data-testid="data-import-modal" class="space-y-4">
		<div class="flex flex-wrap items-end gap-3">
			<label class="min-w-64 flex-1 space-y-1 text-sm">
				<span>{$t('durableImport.history')}</span>
				<select class="h-10 w-full rounded-md border bg-background px-3" value={page.modals.target ?? ''} onchange={event => page.selectImportBatch(event.currentTarget.value || null)} disabled={importState.busy}>
					<option value="">{$t('durableImport.new')}</option>
					{#each importState.history as batch (batch.id)}
						<option value={batch.id}>{batch.createdAt.slice(0, 16).replace('T', ' ')} · {academicContext.years.find(year => year.id === batch.academicYearId)?.label ?? batch.academicYearId} · {$t(`durableImport.status.${batch.state}`)}</option>
					{/each}
					{#if importState.detail && !importState.history.some(batch => batch.id === importState.detail?.batch.id)}
						<option value={importState.detail.batch.id}>{importState.detail.batch.createdAt} · {$t(`durableImport.status.${importState.detail.batch.state}`)}</option>
					{/if}
				</select>
			</label>
			<Button variant="outline" onclick={() => importState.moreHistory()} disabled={importState.loading}>{$t('durableImport.older')}</Button>
			<Button variant="outline" onclick={() => importState.refresh()} disabled={!importState.detail || importState.busy}>{$t('durableImport.refresh')}</Button>
		</div>
		{#if importState.loading}<p role="status" class="text-sm text-muted-foreground">{$t('durableImport.loading')}</p>{/if}
		<DataState status={importState.error ? 'error' : 'ready'} errorMessage={importState.error}>
			<section class="space-y-3 rounded-lg border p-4" aria-label={$t('durableImport.settings')}>
				<div class="grid gap-3 sm:grid-cols-3">
					<label class="space-y-1 text-sm"><span>{$t('durableImport.year')}</span>
						<select class="h-10 w-full rounded-md border bg-background px-3" bind:value={yearId} disabled={Boolean(importState.detail) || importState.busy}>
							{#each academicContext.years as year (year.id)}<option value={year.id}>{year.label}</option>{/each}
						</select>
					</label>
					<label class="space-y-1 text-sm"><span>{$t('durableImport.mode')}</span>
						<select class="h-10 w-full rounded-md border bg-background px-3" data-testid="import-mode" bind:value={mode} disabled={running || importState.busy}>
							<option value="M">M — {$t('durableImport.merge')}</option><option value="S">S — {$t('durableImport.skip')}</option><option value="O">O — {$t('durableImport.overwrite')}</option>
						</select>
					</label>
					<label class="space-y-1 text-sm"><span>{$t('durableImport.effectiveDate')}</span>
						<input data-testid="import-enrollment-date" type="date" class="h-10 w-full rounded-md border bg-background px-3" bind:value={effectiveDate} disabled={running || importState.busy} />
					</label>
				</div>
				<p class="text-sm text-muted-foreground">{$t(`durableImport.modeHelp.${mode}`)} {$t('durableImport.rowOverride')}</p>
				{#if importState.detail}
					<Button variant="outline" disabled={!settingsDirty || importState.busy || running} onclick={() => importState.settings(mode, effectiveDate)}>{$t('durableImport.saveSettings')}</Button>
				{:else}
					<Button disabled={!yearId || importState.busy} data-testid="import-create" onclick={create}>{$t('durableImport.create')}</Button>
				{/if}
			</section>
			<section class="space-y-3 rounded-lg border p-4" aria-label={$t('durableImport.files')}>
				<div class="flex flex-wrap items-end gap-3">
					<label class="min-w-60 flex-1 space-y-1 text-sm"><span>{$t('durableImport.type')}</span>
						<select class="h-10 w-full rounded-md border bg-background px-3" data-testid="data-import-type-select" value={importType} onchange={event => onImportTypeChange?.(event.currentTarget.value as ImportTypeKey)} disabled={importState.busy || Boolean(replacementId)}>
							{#each definitions as definition (definition.key)}<option value={definition.key}>{$t(definition.labelKey)}</option>{/each}
						</select>
					</label>
					<Button data-testid="import-template-xlsx" variant="outline" onclick={() => importState.template(importType, 'xlsx')}>{$t('durableImport.template')} XLSX</Button>
					<Button variant="outline" onclick={() => importState.template(importType, 'csv')}>{$t('durableImport.template')} CSV</Button>
				</div>
				{#if importState.detail}
					<label class="block space-y-1 text-sm"><span>{$t('durableImport.destination')}</span>
						<select class="h-10 w-full rounded-md border bg-background px-3" bind:value={replacementId} disabled={running || importState.busy}>
							<option value="">{$t('durableImport.addFile')}</option>
							{#each files as file (file.fileId)}<option value={file.fileId}>{$t('durableImport.replace')} {file.fileName} · {typeLabel(file.type)}</option>{/each}
						</select>
					</label>
					<label class="block space-y-1 text-sm"><span>{$t('durableImport.chooseFile')}</span><input data-testid="import-file-input" type="file" accept=".csv,.xlsx" multiple={!replacementId} bind:files={selectedFiles} disabled={running || importState.busy} class="block w-full rounded-md border p-2" /></label>
					<p class="text-xs text-muted-foreground">{$t('durableImport.fileLimit')} {$t('durableImport.correctionHelp')}</p>
					<Button disabled={!selectedFiles?.length || importState.busy || running || settingsDirty} data-testid="import-upload" onclick={upload}>{$t('durableImport.upload')}</Button>
					<ul class="space-y-2">
						{#each files as file (file.fileId)}
							<li class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 p-3 text-sm">
								<span>{file.fileName} · {typeLabel(file.type)} · v{file.revision}</span>
								<div class="flex gap-2"><Button data-testid="import-corrections-xlsx" variant="outline" size="sm" onclick={() => importState.report(file.fileId)}>{$t('durableImport.corrections')} XLSX</Button><Button variant="outline" size="sm" onclick={() => importState.report(file.fileId, 'csv')}>CSV</Button></div>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
			{#if importState.detail}
				<section data-testid="import-progress" data-state={importState.detail.batch.state} data-created={importState.detail.counts.created ?? 0} data-blocked={(importState.detail.counts.blocked ?? 0) + (importState.detail.counts.dependency_blocked ?? 0)} class="space-y-3" aria-label={$t('durableImport.preview')}>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h3 class="font-semibold">{$t('durableImport.preview')} · {$t(`durableImport.status.${importState.detail.batch.state}`)}</h3>
						<div class="flex flex-wrap gap-2">
							<Button variant="outline" disabled={importState.busy || running || !files.length || settingsDirty} data-testid="import-validate" onclick={() => importState.validate()}>{$t('durableImport.validate')}</Button>
							{#if !running && importState.detail.batch.state === 'completed'}<Button variant="outline" disabled={importState.busy || settingsDirty} onclick={() => importState.retry()}>{$t('durableImport.retry')}</Button>{/if}
							<Button disabled={importState.busy || settingsDirty || importState.detail.batch.state !== 'validated' || ready === 0} data-testid="import-confirm" onclick={() => importState.confirm()}>{$t('durableImport.confirm')} ({ready}) · {importState.detail.batch.defaultOnExisting}</Button>
							{#if running}<Button variant="outline" disabled={importState.busy} onclick={() => importState.cancel()}>{$t('durableImport.stop')}</Button>{/if}
						</div>
					</div>
					{#if running}<p role="status" class="rounded-md bg-primary/10 p-3 text-sm">{$t('durableImport.background')}</p>{/if}
					<div class="flex flex-wrap gap-2" aria-live="polite">
						{#each Object.entries(importState.detail.counts) as [key, count] (key)}<span class="rounded-full bg-muted px-3 py-1 text-xs">{$t(`durableImport.outcome.${key}`)}: {count}</span>{/each}
					</div>
					<label class="block max-w-xs space-y-1 text-sm"><span>{$t('durableImport.filter')}</span>
						<select class="h-10 w-full rounded-md border bg-background px-3" bind:value={outcomeFilter} onchange={() => { pageIndex = 0; }}><option value="">{$t('durableImport.all')}</option>{#each ['pending', 'created', 'updated', 'unchanged', 'skipped', 'blocked', 'dependency_blocked', 'failed', 'cancelled'] as outcome (outcome)}<option value={outcome}>{$t(`durableImport.outcome.${outcome}`)}</option>{/each}</select>
					</label>
					<div class="overflow-x-auto rounded-lg border">
						<table class="w-full min-w-[800px] text-left text-sm">
							<thead class="bg-muted"><tr><th class="p-3">{$t('durableImport.source')}</th><th class="p-3">{$t('durableImport.mode')}</th><th class="p-3">{$t('durableImport.result')}</th><th class="p-3">{$t('durableImport.changes')}</th></tr></thead>
							<tbody>{#each visibleRows as row (row.id)}
								<tr class="border-t align-top">
									<td class="p-3"><span>{files.find(file => file.fileId === row.source.fileId)?.fileName} : {row.source.row}</span><p class="text-xs text-muted-foreground">{typeLabel(row.type)}</p></td>
									<td class="p-3">{row.effectiveMode}</td>
									<td class="max-w-sm p-3"><span>{$t(`durableImport.outcome.${row.outcome}`)}</span>{#each row.issues as issue, index (`${issue.code}:${index}`)}<p class="mt-1 break-words text-xs text-destructive">{issue.code}{issue.column ? ` (${issue.column})` : ''}{issue.candidates?.length ? `: ${issue.candidates.join(', ')}` : ''}</p>{/each}</td>
									<td class="p-3"><details><summary class="cursor-pointer">{$t('durableImport.inspect')}</summary><p class="my-2 break-all text-xs">{$t('durableImport.target')}: {row.current ? row.targetId : $t('durableImport.newRecord')}</p>
										<table class="my-2 w-full text-xs"><thead><tr><th class="p-1">{$t('durableImport.field')}</th><th class="p-1">{$t('durableImport.current')}</th><th class="p-1">{$t('durableImport.resulting')}</th></tr></thead><tbody>{#each [...new Set([...Object.keys(row.current ?? {}), ...Object.keys(row.proposed ?? {})])] as key (key)}<tr class="border-t"><th class="p-1 font-normal">{key}</th><td class="max-w-56 break-words p-1">{display(row.current?.[key])}</td><td class="max-w-56 break-words p-1">{display(row.proposed?.[key])}</td></tr>{/each}</tbody></table>
										<details><summary class="cursor-pointer">{$t('durableImport.imported')}</summary><dl>{#each Object.entries(row.raw) as [key, value] (key)}<dt class="mt-2 text-xs font-semibold">{key}</dt><dd class="max-w-80 break-words text-xs">{display(value)}</dd>{/each}</dl></details>
									</details></td>
								</tr>
							{:else}<tr><td colspan="4" class="p-6 text-center text-muted-foreground">{$t('durableImport.empty')}</td></tr>{/each}</tbody>
						</table>
					</div>
					<div class="flex items-center justify-end gap-3"><Button variant="outline" size="sm" disabled={visiblePageIndex === 0} onclick={() => pageIndex = visiblePageIndex - 1}>{$t('durableImport.previous')}</Button><span class="text-sm">{visiblePageIndex + 1} / {Math.max(1, Math.ceil(rows.length / 50))}</span><Button variant="outline" size="sm" disabled={(visiblePageIndex + 1) * 50 >= rows.length} onclick={() => pageIndex = visiblePageIndex + 1}>{$t('durableImport.next')}</Button></div>
				</section>
			{/if}
		</DataState>
	</div>
	{#snippet footer({ close })}<Button variant="outline" onclick={close}>{$t('durableImport.close')}</Button>{/snippet}
</FormModal>

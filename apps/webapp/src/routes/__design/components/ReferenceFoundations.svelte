<script lang="ts">
	import type { PageLoadState } from '$lib/page/load-state';
	import type { ReferenceCopy } from '../reference-copy';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import { locale } from '$lib/i18n';
	import { PAGE_QUERY_RETRY } from '$lib/queries/retry-context';
	import { BADGE_DANGER, BADGE_INFO, BADGE_SUCCESS, BADGE_WARN } from '$lib/ui-tones';
	import { setContext } from 'svelte';
	import ReferenceSelect from './ReferenceSelect.svelte';

	const { copy }: { copy: ReferenceCopy } = $props();
	setContext(PAGE_QUERY_RETRY, undefined);
	let readState = $state<PageLoadState>('ready');
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const instant = new Date('2026-10-24T14:30:00Z');
	const formattedTime = $derived(new Intl.DateTimeFormat($locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(instant));
	const states = $derived([
		['ready', copy.ready],
		['loading', copy.loading],
		['refreshing', copy.refreshing],
		['loading-more', copy.more],
		['empty', copy.empty],
		['no-match', copy.noMatch],
		['denied', copy.denied],
		['unavailable', copy.unavailable],
		['error', copy.failed],
	] as const);
</script>

<section id="foundations" class="reference-section space-y-6 bg-card p-4 md:p-6">
	<h2 class="font-display text-xl font-semibold">{copy.foundations}</h2>
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
		<div class="space-y-4"><h3 class="font-display text-xl font-semibold">{copy.palette}</h3>
			<div class="flex flex-wrap gap-4">
				{#each [[copy.primary, 'bg-primary text-primary-foreground'], [copy.canvas, 'bg-background text-foreground'], [copy.surface, 'border bg-card text-foreground'], [copy.foreground, 'bg-foreground text-background'], [copy.muted, 'bg-muted text-muted-foreground']] as [label, tone] (label)}
					<div class="p-4 text-sm {tone}">{label}</div>
				{/each}
			</div>
			<div class="flex flex-wrap gap-2">{#each [[copy.success, BADGE_SUCCESS], [copy.warning, BADGE_WARN], [copy.danger, BADGE_DANGER], [copy.ready, BADGE_INFO]] as [label, tone] (label)}<span data-reference-badge class="px-3 py-1 text-xs {tone}">{label}</span>{/each}</div>
		</div>
		<div class="space-y-4"><h3 class="font-display text-xl font-semibold">{copy.typography}</h3>
			<p class="font-display text-2xl font-semibold leading-[1.3] md:text-[1.75rem]">{copy.pageTitle} · Poppins</p>
			<p class="font-display text-xl font-semibold leading-[1.3]">{copy.sectionTitle} · Poppins</p>
			<p class="text-sm font-semibold leading-normal">{copy.identity} · Inter</p>
			<p class="text-sm leading-normal">{copy.body} · Inter</p><p class="text-xs leading-normal">{copy.metadata} · Inter</p>
		</div>
	</div>
	<p class="text-sm">{copy.spacing}</p>
	<div class="space-y-4"><h3 class="font-display text-xl font-semibold">{copy.values}</h3>
		<dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each [[copy.zero, new Intl.NumberFormat($locale, { style: 'currency', currency: 'XOF' }).format(0)], [copy.falseValue, copy.no], [copy.absent, copy.absent], [copy.unavailable, copy.unavailable], [copy.restricted, copy.restricted], [copy.notRecorded, copy.notRecorded]] as [label, value] (label)}
				<div><dt class="text-xs text-muted-foreground">{label}</dt><dd class="break-words text-sm tabular-nums">{value}</dd></div>
			{/each}
		</dl>
		<p class="text-sm">{copy.date}: <time datetime={instant.toISOString()}>{formattedTime}</time> · {timezone}</p>
		<details><summary class="control-focus min-h-11 cursor-pointer py-3 text-sm">{copy.fullText}</summary><p class="text-sm">{copy.longText}</p></details>
		<details><summary class="control-focus min-h-11 cursor-pointer py-3 text-sm">{copy.technical}</summary><code class="break-all text-xs">fixture:reference-only</code></details>
	</div>
</section>
<section id="read-states" class="reference-section space-y-4 bg-card p-4 md:p-6">
	<h2 class="font-display text-xl font-semibold">{copy.states}</h2>
	<div class="max-w-lg"><ReferenceSelect label={copy.states} data-testid="reference-read-state" bind:value={readState} options={states.map(([value, label]) => ({ value, label }))} /></div>
	{#if readState === 'unavailable' || readState === 'denied' || readState === 'empty' || readState === 'error'}
		<div class="space-y-4 border-t pt-4" role={readState === 'error' ? 'alert' : 'status'}>
			<h3 class="font-display text-xl font-semibold">{readState === 'unavailable' ? copy.unavailable : readState === 'denied' ? copy.denied : readState === 'empty' ? copy.empty : copy.failed}</h3>
			<p class="text-sm">{readState === 'unavailable' ? copy.unavailableHint : readState === 'denied' ? copy.deniedHint : readState === 'empty' ? copy.emptyHint : copy.failedHint}</p>
			{#if readState === 'error'}<Button variant="outline" onclick={() => readState = 'ready'}>{copy.retry}</Button>{/if}
		</div>
	{:else}<DataState status={readState}><p class="text-sm">Aminata Mariam Koné-Diabaté · 6e A</p></DataState>{/if}
	<p role="status" class="text-sm">{copy.savedRefresh}</p><p class="text-sm">{copy.partial}</p>
</section>
<section id="brand" class="reference-section space-y-4 bg-card p-4 md:p-6">
	<h2 class="font-display text-xl font-semibold">{copy.brand}</h2>
	<div class="flex flex-wrap items-center gap-6"><BrandLogo variant="vertical" width={88} /><BrandLogo width={128} /><BrandLogo variant="symbol" width={32} /></div>
	<div class="flex flex-wrap items-center gap-6 bg-primary p-6"><BrandLogo variant="vertical" tone="white" width={88} /><BrandLogo tone="white" width={128} /><BrandLogo variant="symbol" tone="white" width={32} /></div>
</section>

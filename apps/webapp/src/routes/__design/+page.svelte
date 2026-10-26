<script lang="ts">
	import { page } from '$app/stores';
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { lang, setLang } from '$lib/i18n';
	import ReferenceCollections from './components/ReferenceCollections.svelte';
	import ReferenceControls from './components/ReferenceControls.svelte';
	import ReferenceFoundations from './components/ReferenceFoundations.svelte';
	import ReferenceTasks from './components/ReferenceTasks.svelte';
	import { referenceCopy } from './reference-copy';
	import './reference-geometry.css';

	const copy = $derived(referenceCopy[$lang]);
	let previewWidth = $state('full');
	let textScale = $state('1');
	const framed = $derived($page.url.searchParams.get('referenceFrame') === '1');
	const frameSrc = $derived(`/__design?referenceFrame=1&referenceScale=${textScale}&referenceLocale=${$lang}`);
	$effect(() => {
		if (!framed)
			return;
		const language = $page.url.searchParams.get('referenceLocale');
		if (language === 'fr' || language === 'en')
			setLang(language);
		const previous = document.documentElement.style.fontSize;
		document.documentElement.style.fontSize = $page.url.searchParams.get('referenceScale') === '2' ? '200%' : '100%';
		return () => {
			document.documentElement.style.fontSize = previous;
		};
	});
</script>

<div data-design-reference class="mx-auto max-w-[1400px] space-y-6 p-4 md:p-6">
	<header class="flex flex-wrap items-center justify-between gap-4"><BrandLogo width={144} /><LanguageSelector /></header>
	<ListPageHeader title={copy.title} description={copy.intro} />
	{#if !framed}
		<div class="flex flex-wrap gap-4 border bg-card p-4">
			<label class="space-y-2 text-sm"><span class="block">{copy.viewport}</span><select data-testid="reference-viewport" class="min-h-11 border border-input bg-background px-4" bind:value={previewWidth}><option value="full">{copy.fullWidth}</option><option value="360">360px</option><option value="768">768px</option><option value="1024">1024px</option><option value="1280">1280px</option></select></label>
			<label class="space-y-2 text-sm"><span class="block">{copy.textScale}</span><select data-testid="reference-scale" class="min-h-11 border border-input bg-background px-4" bind:value={textScale}><option value="1">100%</option><option value="2">200%</option></select></label>
		</div>
	{/if}
	{#if !framed && (previewWidth !== 'full' || textScale !== '1')}
		<div class="max-w-full overflow-x-auto border"><iframe title={copy.preview} src={frameSrc} style:width={previewWidth === 'full' ? '100%' : `${previewWidth}px`} class="h-[80dvh] min-h-96 border-0 bg-background"></iframe></div>
	{:else}
		<nav aria-label={copy.title} class="flex flex-wrap gap-2 text-sm">
			{#each [['controls', copy.controls], ['collections', copy.collections], ['tasks', copy.tasks], ['foundations', copy.foundations], ['read-states', copy.states], ['brand', copy.brand], ['coverage', copy.coverage]] as [id, label] (id)}<a class="control-focus inline-flex min-h-11 items-center px-4 text-primary hover:underline focus-visible:underline" href={`#${id}`}>{label}</a>{/each}
		</nav>
		<ReferenceControls {copy} />
		<ReferenceCollections {copy} />
		<ReferenceTasks {copy} />
		<ReferenceFoundations {copy} />
		<section id="coverage" class="space-y-4 border bg-card p-4 md:p-6">
			<h2 class="font-display text-xl font-semibold">{copy.coverage}</h2>
			<p class="text-sm">{copy.featureCoverage}</p>
			<h3 class="font-display text-xl font-semibold">{copy.remaining}</h3>
			<dl class="space-y-4 text-sm"><div><dt class="font-semibold">{copy.account}</dt><dd>{copy.accountCoverage}</dd></div><div><dt class="font-semibold">{copy.specialized}</dt><dd>{copy.specializedCoverage}</dd></div></dl>
			<h3 class="font-display text-xl font-semibold">{copy.accessibility}</h3><p class="text-sm">{copy.accessibilityHint}</p>
		</section>
	{/if}
</div>

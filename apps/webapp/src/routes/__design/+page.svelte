<script lang="ts">
	import LanguageSelector from '$lib/components/layout/LanguageSelector.svelte';
	import DrawerEntityHeader from '$lib/components/school/shared/DrawerEntityHeader.svelte';
	import DrawerField from '$lib/components/school/shared/DrawerField.svelte';
	import BrandLogo from '$lib/components/ui/BrandLogo.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import DataState from '$lib/components/ui/DataState.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import ListEntityTable from '$lib/components/ui/ListEntityTable.svelte';
	import ListPageHeader from '$lib/components/ui/ListPageHeader.svelte';
	import { LoaderCircle } from '$lib/icons';
	import { BADGE_INFO, BADGE_SUCCESS, BADGE_WARN, BADGE_DANGER } from '$lib/ui-tones';

	let open = $state(false);
	let selected = $state('1');
	const rows = [
		{ id: '1', name: 'Aminata Mariam Koné-Diabaté', className: '6e A', amount: '1 250 000 XOF' },
		{ id: '2', name: 'Issa Traoré', className: '6e B', amount: '450 000 XOF' },
		{ id: '3', name: 'Fatou Bamba', className: '5e A', amount: '800 000 XOF' },
	];
</script>

<div class="mx-auto max-w-[1400px] p-4 md:p-8">
	<header class="mb-8 flex items-center justify-between"><BrandLogo width={144} /><LanguageSelector /></header>
	<p class="mb-6 text-sm text-muted-foreground">EDAYA UI 1.0.0 · Production component gallery · Isolated fixtures · Development only</p>
	<ListPageHeader eyebrow="ÉTABLISSEMENT" title="Élèves" description="Contexte, données et actions familières.">
		{#snippet search()}<Input aria-label="Rechercher" placeholder="Rechercher un élève" class="rounded-full" />{/snippet}
		{#snippet primary()}<Button onclick={() => open = true}>Ajouter un élève</Button>{/snippet}
	</ListPageHeader>
	<div class="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
		<div class="min-w-0 space-y-6">
			<ListEntityTable listKey="design-preview" columns={[{ key: 'name', label: 'Élève', span: 6 }, { key: 'class', label: 'Classe', span: 2 }, { key: 'amount', label: 'Montant', span: 4, class: 'justify-end' }]} {rows} highlightId={selected} onRowClick={item => selected = item.id}>
				{#snippet cell(item, column, _ctx)}

					{#if column.key === 'name'}
						<span class="col-span-6 min-w-0 font-medium">{item.name}</span>
					{:else if column.key === 'class'}
						<span class="col-span-2">{item.className}</span>
					{:else if column.key === 'amount'}
						<span class="col-span-4 text-right tabular-nums">{item.amount}</span>
					{/if}
				{/snippet}
			</ListEntityTable>
			<section class="space-y-4 rounded-2xl border border-border bg-card p-6">
				<h3 class="font-display text-xl font-semibold">Actions & états</h3>
				<div class="flex flex-wrap gap-3"><Button>Enregistrer</Button><Button variant="outline">Annuler</Button><Button variant="destructive">Supprimer</Button><Button disabled>Indisponible</Button><Button disabled><LoaderCircle class="mr-2 h-4 w-4" />Enregistrement…</Button></div>
				<div class="flex flex-wrap gap-3">{#each [[BADGE_INFO, 'Information'], [BADGE_SUCCESS, 'Terminé'], [BADGE_WARN, 'En attente'], [BADGE_DANGER, 'Erreur']] as [tone, label] (label)}<span class="rounded-full px-3 py-1 text-xs font-medium {tone}">{label}</span>{/each}</div>
				<div class="space-y-2"><Label for="gallery-field">E-mail</Label><Input id="gallery-field" value="famille@example.test" /><p class="text-xs text-muted-foreground">Label persistant et contour visible.</p></div>
				<div class="space-y-2"><Label for="gallery-disabled">Champ indisponible</Label><Input id="gallery-disabled" value="Bulletin publié" disabled /></div>
				<div class="space-y-2"><Label for="gallery-error">Champ avec erreur</Label><Input id="gallery-error" aria-invalid="true" aria-describedby="gallery-error-message" class="border-destructive" /><p id="gallery-error-message" class="text-sm text-destructive">Ce champ est requis.</p></div>
			</section>
		</div>
		<aside class="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-panel">
			<DrawerEntityHeader name={rows.find(row => row.id === selected)?.name} summary="6e A · 2026–2027">
				{#snippet chips()}<span class="rounded-full px-3 py-1 text-xs {BADGE_INFO}">Élève</span>{/snippet}
				{#snippet actions()}<Button variant="outline" onclick={() => open = true}>Modifier</Button>{/snippet}
			</DrawerEntityHeader>
			<DrawerField label="Classe">6e A</DrawerField><DrawerField label="Scolarité"><span class="tabular-nums">1 250 000 XOF</span></DrawerField>
			<p class="text-sm text-muted-foreground">Composition des composants de détail existants. Le parcours réel conserve son tiroir lié à l’URL.</p>
		</aside>
	</div>
	<section class="mt-6 grid gap-6 rounded-2xl border border-border bg-card p-6 md:grid-cols-2">
		<div><h3 class="font-display text-xl font-semibold">État vide</h3><DataState status="empty" /></div>
		<div><h3 class="font-display text-xl font-semibold">Erreur de chargement</h3><DataState status="error" /></div>
	</section>
	<section class="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
		<h3 class="font-display text-xl font-semibold">Artwork approuvé</h3>
		<div class="flex flex-wrap items-center gap-6"><BrandLogo variant="vertical" width={88} /><BrandLogo width={128} /><BrandLogo variant="symbol" width={32} /></div>
		<div class="flex flex-wrap items-center gap-6 rounded-2xl bg-primary p-6"><BrandLogo variant="vertical" tone="white" width={88} /><BrandLogo tone="white" width={128} /><BrandLogo variant="symbol" tone="white" width={32} /></div>
	</section>
	<FormModal bind:open title="Modifier l’élève" description="Formulaire de présentation, sans écriture de données." onSubmit={() => { open = false; }}>
		<div class="space-y-2"><Label for="gallery-name">Nom</Label><Input id="gallery-name" value="Aminata Mariam Koné-Diabaté" /></div>
		<div class="space-y-2"><Label for="gallery-email">E-mail</Label><Input id="gallery-email" type="email" value="famille@example.test" /></div>
	</FormModal>
</div>

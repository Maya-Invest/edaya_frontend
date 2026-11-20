<script lang="ts">
	import type { AccountActor } from '$lib/auth/account-actor';
	import AppHeader from '$lib/components/layout/AppHeader.svelte';
	import type { AcademicYear, AcademicPeriod } from '../../../src/lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import AppSidebar from '$lib/components/layout/AppSidebar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import MobileSidebar from '$lib/components/layout/MobileSidebar.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { setLang, t } from '$lib/i18n';
	import { provideDirtyWork } from '$lib/interaction/dirty-work.svelte';
	import { getPageQueryCache, setPageQueryCache } from '$lib/queries/page-query-cache';
	import { shellContext } from '$lib/shell/context.svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { onDestroy } from 'svelte';
	import { authSession } from './environment.svelte';

	const params = new URL(location.href).searchParams;
	setLang(params.get('lang') === 'fr' ? 'fr' : 'en');
	const dirtyWork = provideDirtyWork();
	const desktop = new MediaQuery('(min-width: 1024px)');
	let headerHeight = $state<number>();
	let mobileOpen = $state(false);
	function toggleNavigation() {
		if (desktop.current)
			shellContext.toggleSidebar();
		else
			mobileOpen = !mobileOpen;
	}
	let profileOpen = $state(false);
	let actor = $state<AccountActor>({ id: 'staff', kind: 'staff', name: 'Aminata Koné', initials: 'AK', subtitleKey: 'staff.role.owner', subjectId: 'login' });
	let draft = $state('');
	let cacheVersion = $state(0);
	const years: AcademicYear[] = [
		{ id: 'published', schoolId: 'school', label: '2026–2027', startDate: '2026-09-01', endDate: '2027-06-30', status: 'published' },
		{ id: 'draft', schoolId: 'school', label: '2027–2028', startDate: '2027-09-01', endDate: '2028-06-30', status: 'draft' },
		{ id: 'archived', schoolId: 'school', label: '2025–2026', startDate: '2025-09-01', endDate: '2026-06-30', status: 'archived' },
	];
	const periods: AcademicPeriod[] = [{ id: 'term', schoolId: 'school', academicYearId: 'published', label: 'Term 1', range: '2026-09-01 → 2026-12-15', startDate: '2026-09-01', endDate: '2026-12-15', status: 'published' }];
	const otherYears: AcademicYear[] = [
		{ ...years[0], schoolId: 'other', id: 'other-year', label: 'Other school year' },
		{ ...years[1], schoolId: 'other', id: 'other-draft', label: 'Other draft' },
	];
	let previewMode = 'normal';
	let releasePreview: (() => void) | undefined;
	function loadSchool(schoolId: string, yearId: string | undefined = undefined) {
		authSession.schoolId = schoolId;
		authSession.school.shortName = schoolId === 'school' ? 'Oak School' : 'Other school';
		academicContext.setSchoolScope(schoolId);
		academicContext.init(schoolId === 'school' ? structuredClone(years) : previewMode === 'empty' ? [] : structuredClone(otherYears), schoolId === 'school' ? periods : [], []);
		if (yearId !== undefined) academicContext.setYear(yearId);
		academicContext.shellReady = true;
	}
	loadSchool('school');
	const unregister = dirtyWork.register({ isDirty: () => Boolean(draft), discard: () => { draft = ''; } });
	onDestroy(unregister);
	const cachePresent = $derived.by(() => { void cacheVersion; void academicContext.scopeGeneration; return Boolean(getPageQueryCache('/fixture')); });
	const control = {
		school: loadSchool,
		previewMode: (value: string) => { previewMode = value; },
		releasePreview: () => releasePreview?.(),
		preview: async (member: { actorId: string; schoolId: string }) => {
			if (member.schoolId === 'school' && member.actorId === 'staff') return years;
			if (member.schoolId !== 'other' || member.actorId !== 'other-staff') throw new Error('Unexpected membership');
			if (previewMode === 'error') throw new Error('Unavailable');
			if (previewMode === 'slow') await new Promise<void>(resolve => { releasePreview = resolve; });
			return previewMode === 'empty' ? [] : otherYears;
		},
		account: () => { authSession.authUserId = 'other-login'; },
		remove: (id: string) => { academicContext.years = academicContext.years.filter(year => year.id !== id); },
		loading: (value: boolean) => { academicContext.shellReady = !value; },
		empty: () => { academicContext.init([], [], []); },
		missing: () => { academicContext.yearId = 'missing'; },
		longHeaderNames: () => { authSession.school.shortName = 'Établissement international d’enseignement et de formation'; actor.name = 'Aminata Mariam Koné-Diabaté de la Fontaine'; },
		multipleSchools: () => { authSession.staffMemberships = [{ kind: 'staff', actorId: 'staff', schoolId: 'school', schoolName: 'Oak School', schoolShortName: 'Oak' }, { kind: 'staff', actorId: 'other-staff', schoolId: 'other', schoolName: 'Other school', schoolShortName: 'Other' }]; },
		longLabel: () => { academicContext.years = academicContext.years.map(year => ({ ...year, label: `${year.label} · Année scolaire de préparation et d’accompagnement pédagogique international` })); },
	};
	const windowFixture = window as typeof window & { yearFixture?: typeof control };
	windowFixture.yearFixture = control;
	onDestroy(() => { delete windowFixture.yearFixture; });
</script>

<div class="flex h-dvh overflow-hidden bg-background" style:--app-header-height={headerHeight ? `${headerHeight}px` : undefined}>
	{#if desktop.current}<div class="relative h-full shrink-0" style:width={shellContext.sidebarOpen ? '256px' : '56px'}><AppSidebar hierarchy={[]} studentCount={0} guardianCount={0} staffCount={0} teacherCount={0} /></div>
	{:else}<MobileSidebar bind:open={mobileOpen} hierarchy={[]} studentCount={0} guardianCount={0} staffCount={0} teacherCount={0} />{/if}
	<main class="min-w-0 flex-1">
		<AppHeader bind:height={headerHeight} {actor} navigationOpen={desktop.current ? shellContext.sidebarOpen : mobileOpen} {profileOpen} onToggleNavigation={toggleNavigation} onOpenProfile={() => profileOpen = true} />
		<div class="space-y-4 p-4">
		<Label for="fixture-draft">Fixture draft</Label><Input id="fixture-draft" bind:value={draft} />
		<Button data-testid="seed-cache" onclick={() => { setPageQueryCache('/fixture', { status: 'ready', items: [{ id: 'old-scope' }] }); cacheVersion++; }}>Seed read cache</Button>
		<output data-testid="scope">{JSON.stringify({ year: academicContext.yearId, period: academicContext.periodId, school: academicContext.schoolScopeId, generation: academicContext.scopeGeneration, cache: cachePresent })}</output>
		</div>
	</main>
</div>
<ConfirmModal open={dirtyWork.pending !== null} title={$t('form.discardTitle')} description={$t('form.discardDescription')} confirmLabel={$t('form.discard')} cancelLabel={$t('form.keepEditing')} onOpenChange={value => { if (!value) dirtyWork.cancel(); }} onCancel={() => dirtyWork.cancel()} onConfirm={() => dirtyWork.discard()} />

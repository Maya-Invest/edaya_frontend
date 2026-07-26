<script lang="ts">
	import type { CatalogSubject, StructureTemplateCatalog } from '$lib/onboarding/structure-template-catalog';
	import Button from '$lib/components/ui/button/button.svelte';
	import OnboardingSubjectChaptersDrawer from '$lib/components/onboarding/OnboardingSubjectChaptersDrawer.svelte';
	import { t } from '$lib/i18n';
	import { onboardingContext } from '$lib/onboarding/context.svelte';
	import { buildCompleteStepSummary } from '$lib/onboarding/complete-step-summary';
	import { getOnboardingWizardState } from '$lib/onboarding/onboarding-wizard-state.svelte';
	import { loadStructureTemplateCatalog } from '$lib/onboarding/structure-template-catalog';
	import { ChevronRight } from '$lib/icons';

	const wizard = getOnboardingWizardState();

	let catalog = $state<StructureTemplateCatalog | null>(null);
	let catalogStatus = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
	let loadToken = 0;
	let selectedSubject = $state<{
		levelCode: string;
		subject: CatalogSubject;
	} | null>(null);

	const summary = $derived(
		buildCompleteStepSummary(onboardingContext.draft, catalog),
	);

	function goToStep(step: 1 | 2 | 3) {
		wizard.navigateToStep(step);
	}

	async function ensureCatalog(country: string) {
		const normalizedCountry = country.trim();
		const token = ++loadToken;
		catalogStatus = 'loading';
		try {
			const next = await loadStructureTemplateCatalog(normalizedCountry);
			if (token !== loadToken) {
				return;
			}
			catalog = next;
			catalogStatus = 'ready';
		}
		catch {
			if (token !== loadToken) {
				return;
			}
			catalogStatus = 'error';
		}
	}

	function closeSubjectDrawer() {
		selectedSubject = null;
	}

	function selectSubject(levelCode: string, subject: CatalogSubject) {
		selectedSubject = { levelCode, subject };
	}

	function handleSubjectRowKeydown(
		event: KeyboardEvent,
		levelCode: string,
		subject: CatalogSubject,
	) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			selectSubject(levelCode, subject);
		}
	}

	$effect(() => {
		const country = onboardingContext.draft.school.country;
		void ensureCatalog(country);
	});
</script>

<div class="space-y-2">
	<header class="space-y-0.5">
		<h2 class="text-sm font-semibold text-foreground">
			{$t('onboarding.complete.readyTitle')}
		</h2>
		<p class="text-xs text-muted-foreground">
			{$t('onboarding.complete.readyBody')}
		</p>
	</header>

	<p class="text-xs text-muted-foreground">
		{$t('onboarding.complete.summaryCounts', summary)}
	</p>

	{#if catalogStatus === 'loading'}
		<p class="text-xs text-muted-foreground">{$t('onboarding.complete.catalogLoading')}</p>
	{:else if catalogStatus === 'error'}
		<p class="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
			{$t('onboarding.complete.catalogError')}
		</p>
	{/if}

	<section class="rounded-md border border-border bg-card px-2.5 py-1.5">
		<div class="flex items-center justify-between gap-2">
			<h3 class="text-xs font-medium text-foreground">{$t('onboarding.complete.sectionSchool')}</h3>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				data-step="1"
				onclick={() => goToStep(1)}
			>
				{$t('onboarding.complete.edit')}
			</Button>
		</div>
		<table class="w-full text-xs">
			<tbody>
				<tr class="border-b border-border/60">
					<td class="px-1.5 py-1.5 text-muted-foreground">{$t('onboarding.schoolNameLabel')}</td>
					<td class="px-1.5 py-1.5 font-medium">{summary.schoolLine || '—'}</td>
				</tr>
				<tr class="border-b border-border/60">
					<td class="px-1.5 py-1.5 text-muted-foreground">{$t('onboarding.schoolSection.academicYear')}</td>
					<td class="px-1.5 py-1.5 font-medium">
						{summary.academicYearLabel || '—'}
						{#if summary.academicYearRange}
							<span class="font-normal text-muted-foreground"> · {summary.academicYearRange}</span>
						{/if}
					</td>
				</tr>
				<tr class="border-b border-border/60 last:border-0">
					<td class="px-1.5 py-1.5 text-muted-foreground">{$t('onboarding.periodTypeLabel')}</td>
					<td class="px-1.5 py-1.5 font-medium">{$t(summary.periodTypeLabelKey)}</td>
				</tr>
			</tbody>
		</table>
		{#if summary.periods.length > 0}
			<p class="mt-1.5 text-xs font-medium text-foreground">{$t('onboarding.complete.periodsHeading')}</p>
			<table class="w-full text-xs">
				<thead>
					<tr class="border-b border-border text-left text-muted-foreground">
						<th class="px-1.5 py-1 font-medium">{$t('onboarding.periodLabel')}</th>
						<th class="px-1.5 py-1 font-medium">{$t('onboarding.startDateLabel')}</th>
						<th class="px-1.5 py-1 font-medium">{$t('onboarding.endDateLabel')}</th>
					</tr>
				</thead>
				<tbody>
					{#each summary.periods as period (`${period.label}-${period.start}-${period.end}`)}
						<tr class="border-b border-border/60 last:border-0">
							<td class="px-1.5 py-1.5 font-medium">{period.label}</td>
							<td class="px-1.5 py-1.5 text-muted-foreground">{period.start || '—'}</td>
							<td class="px-1.5 py-1.5 text-muted-foreground">{period.end || '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<section class="rounded-md border border-border bg-card px-2.5 py-1.5">
		<div class="flex items-center justify-between gap-2">
			<h3 class="text-xs font-medium text-foreground">{$t('onboarding.complete.sectionStructure')}</h3>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				data-step="2"
				onclick={() => goToStep(2)}
			>
				{$t('onboarding.complete.edit')}
			</Button>
		</div>
		{#if summary.levels.length === 0}
			<p class="text-xs text-muted-foreground">{$t('onboarding.complete.emptyStructure')}</p>
		{:else}
			<div class="max-h-[min(48vh,22rem)] space-y-2 overflow-y-auto">
				{#each summary.levels as level (level.gradeLevelId)}
					<div class="space-y-1.5 rounded-md border border-border/80 bg-muted/30 px-2.5 py-2">
						<p class="text-xs font-medium text-foreground">
							{level.code}
							<span class="font-normal text-muted-foreground">
								· {$t('onboarding.complete.levelClasses', { count: level.classCount })}
							</span>
						</p>
						<p class="text-xs text-muted-foreground">
							{level.classNames.length > 0 ? level.classNames.join(' · ') : '—'}
						</p>
						<table class="w-full text-xs">
							<thead>
								<tr class="border-b border-border text-left text-muted-foreground">
									<th class="px-1.5 py-1 font-medium">{$t('onboarding.complete.colCode')}</th>
									<th class="px-1.5 py-1 font-medium">{$t('onboarding.complete.colSubject')}</th>
									<th class="px-1.5 py-1 text-right font-medium">{$t('onboarding.complete.colChapters')}</th>
								</tr>
							</thead>
							<tbody>
								{#each level.subjects as subject (subject.code)}
									{@const isSelected =
										selectedSubject?.levelCode === level.code &&
										selectedSubject?.subject.code === subject.code}
									<tr
										class="cursor-pointer border-b border-border/60 last:border-0 hover:bg-secondary/80 {isSelected
											? 'bg-primary/10'
											: ''}"
										role="button"
										tabindex="0"
										onclick={() => selectSubject(level.code, subject)}
										onkeydown={(event) => handleSubjectRowKeydown(event, level.code, subject)}
									>
										<td class="px-1.5 py-1.5 font-medium font-mono tabular-nums">{subject.code}</td>
										<td class="px-1.5 py-1.5">{subject.name}</td>
										<td class="px-1.5 py-1.5">
											<span class="flex items-center justify-end gap-1 text-muted-foreground">
												{subject.matters.length}
												<ChevronRight class="h-3.5 w-3.5 shrink-0" />
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<section class="rounded-md border border-border bg-card px-2.5 py-1.5">
		<div class="flex items-center justify-between gap-2">
			<h3 class="text-xs font-medium text-foreground">{$t('onboarding.complete.sectionTeam')}</h3>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				data-step="3"
				onclick={() => goToStep(3)}
			>
				{$t('onboarding.complete.edit')}
			</Button>
		</div>
		{#if summary.staffInvites.length === 0}
			<p class="text-xs text-muted-foreground">{$t('onboarding.complete.emptyTeam')}</p>
		{:else}
			<div class="max-h-[min(28vh,12rem)] overflow-y-auto">
				<table class="w-full text-xs">
					<thead>
						<tr class="border-b border-border text-left text-muted-foreground">
							<th class="px-1.5 py-1 font-medium">{$t('onboarding.staff.emailLabel')}</th>
							<th class="px-1.5 py-1 font-medium">{$t('onboarding.staff.roleLabel')}</th>
						</tr>
					</thead>
					<tbody>
						{#each summary.staffInvites as invite (`${invite.email}-${invite.role}`)}
							<tr class="border-b border-border/60 last:border-0">
								<td class="px-1.5 py-1.5 font-medium">{invite.email}</td>
								<td class="px-1.5 py-1.5 text-muted-foreground">{$t(invite.roleLabelKey)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<OnboardingSubjectChaptersDrawer
		open={selectedSubject !== null}
		levelCode={selectedSubject?.levelCode ?? ''}
		subjectCode={selectedSubject?.subject.code ?? ''}
		subjectName={selectedSubject?.subject.name ?? ''}
		matters={selectedSubject?.subject.matters ?? []}
		onClose={closeSubjectDrawer}
	/>
</div>

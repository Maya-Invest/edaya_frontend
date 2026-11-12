<script lang="ts">
	import type { CatalogSubject } from '$lib/onboarding/dataset-model';
	import Button from '$lib/components/ui/button/button.svelte';
	import { formatLocaleDate } from '$lib/date/format';
	import { lang, locale, t } from '$lib/i18n';
	import { catalogClassName, catalogPeriodLabel, catalogSubjectName } from '$lib/i18n/catalog-label';
	import { ChevronRight } from '$lib/icons';
	import { buildCompleteStepSummary } from '$lib/onboarding/complete-step-summary';
	import { onboardingContext } from '../context.svelte';
	import { getOnboardingWizardState } from '../onboarding-wizard-state.svelte';
	import OnboardingDatasetStatus from './OnboardingDatasetStatus.svelte';
	import OnboardingSubjectChaptersDrawer from './OnboardingSubjectChaptersDrawer.svelte';

	const wizard = getOnboardingWizardState();
	const catalog = $derived(wizard.catalog);
	let selectedSubject = $state<{
		levelCode: string;
		subject: CatalogSubject;
	} | null>(null);

	const summary = $derived(
		buildCompleteStepSummary(onboardingContext.draft, catalog),
	);
	const editsLocked = $derived(wizard.busy || wizard.provisionSucceeded);

	const formattedRange = $derived.by(() => {
		const start = onboardingContext.draft.school.academicYearStart;
		const end = onboardingContext.draft.school.academicYearEnd;
		if (!start.trim() || !end.trim()) {
			return '';
		}
		return `${formatSummaryDate(start)} → ${formatSummaryDate(end)}`;
	});

	function formatSummaryDate(value: string): string {
		const trimmed = value.trim();
		if (!trimmed)
			return '—';
		return formatLocaleDate(trimmed, $locale, { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function goToStep(step: 1 | 2 | 3) {
		if (editsLocked) {
			return;
		}
		wizard.navigateToStep(step);
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

</script>

<OnboardingDatasetStatus disabled={editsLocked} />
<section class="rounded-md border border-border bg-card p-3 space-y-2" aria-label={$t('profile.identifier')}>
	<p>{$t('onboarding.complete.sectionSchool')} · {$t('profile.identifier')}: <strong>{onboardingContext.draft.ownerIdentifier?.trim() || $t('identifier.notProvided')}</strong></p>
	{#each onboardingContext.draft.staffInvites as invite, index (index)}
		<p>{invite.email}: <strong>{invite.identifier?.trim() || $t('identifier.notProvided')}</strong></p>
	{/each}
</section>

{#if catalog && wizard.datasetStatus === 'ready'}
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
			{$t('onboarding.complete.summaryCounts', {
				levelCount: summary.levelCount,
				classCount: summary.classCount,
				subjectCount: summary.subjectCount,
				inviteCount: summary.inviteCount,
			})}
		</p>

		<section class="rounded-md border border-border bg-card px-2.5 py-1.5">
			<div class="flex items-center justify-between gap-2">
				<h3 class="text-xs font-medium text-foreground">{$t('onboarding.complete.sectionSchool')}</h3>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					data-step="1"
					disabled={editsLocked}
					onclick={() => goToStep(1)}
				>
					{$t('onboarding.complete.edit')}
				</Button>
			</div>
			<table class="ui-entry-table w-full text-xs">
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
								<span class="block font-normal text-muted-foreground">{formattedRange}</span>
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
				<table class="ui-entry-table w-full text-xs">
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
								<td class="px-1.5 py-1.5 font-medium">{catalogPeriodLabel(period.label, $lang)}</td>
								<td class="px-1.5 py-1.5 text-muted-foreground">{formatSummaryDate(period.start)}</td>
								<td class="px-1.5 py-1.5 text-muted-foreground">{formatSummaryDate(period.end)}</td>
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
					disabled={editsLocked}
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
								{level.name} · {level.shortName}
								<span class="font-normal text-muted-foreground">
									· {$t('onboarding.complete.levelClasses', { count: level.classCount })}
								</span>
							</p>
							<p class="text-xs text-muted-foreground">
								{level.classNames.length > 0
									? level.classNames.map(name => catalogClassName(name, $lang)).join(' · ')
									: '—'}
							</p>
							{#each level.modules as module (module.code)}
								<h4 class="text-sm font-medium">{module.name || $t('onboarding.dataset.otherSubjects')}</h4>
								<table class="ui-entry-table w-full text-xs">
									<thead>
										<tr class="border-b border-border text-left text-muted-foreground">
											<th class="px-1.5 py-1 font-medium">{$t('profile.shortName')}</th>
											<th class="px-1.5 py-1 font-medium">{$t('onboarding.complete.colSubject')}</th>
											<th class="px-1.5 py-1 text-right font-medium">{$t('onboarding.complete.colChapters')}</th>
										</tr>
									</thead>
									<tbody>
										{#each module.subjects as subject (subject.code)}
											{@const isSelected
												= selectedSubject?.levelCode === level.gradeLevelId
													&& selectedSubject?.subject.code === subject.code}
											<tr
												class="cursor-pointer border-b border-border/60 last:border-0 hover:bg-secondary/80 {isSelected
													? 'bg-primary/10'
													: ''}"
												role="button"
												tabindex="0"
												onclick={() => selectSubject(level.gradeLevelId, subject)}
												onkeydown={event => handleSubjectRowKeydown(event, level.gradeLevelId, subject)}
											>
												<td class="px-1.5 py-1.5 font-medium font-sans tabular-nums">{subject.shortName}</td>
												<td class="px-1.5 py-1.5">{catalogSubjectName(subject.name, $lang, subject.shortName)} {#if subject.isOptional}<span class="text-muted-foreground">· {$t('onboarding.dataset.optional')}</span>{/if}</td>
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
							{/each}
							{#if level.grading}
								<details class="rounded-md border border-border p-3">
									<summary class="cursor-pointer text-sm font-medium">{level.grading.policy.aggregateLabel} · {level.grading.scale.name}</summary>
									<p class="py-2 text-xs">{$t('onboarding.dataset.passing', { score: level.grading.policy.passThreshold })}</p>
									<table class="ui-entry-table w-full text-sm"><tbody>
										{#each level.grading.scale.ranges as range, i (range.code)}
											<tr><td class="p-1">{range.minScore} ≤ {$t('onboarding.dataset.score')} {i === level.grading.scale.ranges.length - 1 ? '≤' : '<'} {range.maxScore}</td><td class="p-1">{range.label}</td></tr>
										{/each}
									</tbody></table>
								</details>
							{/if}
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
					disabled={editsLocked}
					onclick={() => goToStep(3)}
				>
					{$t('onboarding.complete.edit')}
				</Button>
			</div>
			{#if summary.staffInvites.length === 0}
				<p class="text-xs text-muted-foreground">{$t('onboarding.complete.emptyTeam')}</p>
			{:else}
				<div class="max-h-[min(28vh,12rem)] overflow-y-auto">
					<table class="ui-entry-table w-full text-xs">
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
			levelCode={catalog.byId.get(selectedSubject?.levelCode ?? '')?.shortLabel ?? ''}
			subjectCode={selectedSubject?.subject.shortName ?? ''}
			subjectName={catalogSubjectName(selectedSubject?.subject.name ?? '', $lang, selectedSubject?.subject.shortName)}
			matters={selectedSubject?.subject.matters ?? []}
			subject={selectedSubject?.subject}
			onClose={closeSubjectDrawer}
		/>
	</div>

{/if}

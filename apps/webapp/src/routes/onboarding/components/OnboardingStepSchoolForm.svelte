<script lang="ts">
	import ShortNameField from '$lib/components/school/shared/ShortNameField.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { lang, t } from '$lib/i18n';
	import { catalogPeriodLabel, toCanonicalCatalogText } from '$lib/i18n/catalog-label';
	import {
		normalizePeriodCount,
		periodCount,
		setPeriodType,
	} from '$lib/onboarding/school-periods';
	import {
		COMMON_TIMEZONES,
		ONBOARDING_COUNTRIES,
		optionsWithCurrent,
		timezoneForCountry,
	} from '$lib/onboarding/school-step-defaults';
	import { periodFitsInAcademicYear } from '$lib/onboarding/school-step-validation';
	import { onboardingContext } from '../context.svelte';
	import { getOnboardingWizardState } from '../onboarding-wizard-state.svelte';

	interface Props {
		disabled?: boolean;
	}

	const { disabled = false }: Props = $props();
	const wizard = getOnboardingWizardState();

	const periodTypes = [
		{ value: 'trimester', labelKey: 'onboarding.periodType.trimester' as const },
		{ value: 'semester', labelKey: 'onboarding.periodType.semester' as const },
	];

	const countryOptions = $derived(
		optionsWithCurrent(ONBOARDING_COUNTRIES, onboardingContext.draft.school.country),
	);

	const timezoneOptions = $derived(
		optionsWithCurrent(COMMON_TIMEZONES, onboardingContext.draft.school.timezone),
	);

	const selectedTimezone = $derived(onboardingContext.draft.school.timezone);

	const periodDatesValid = $derived(
		periodFitsInAcademicYear(onboardingContext.draft.school),
	);

	$effect(() => {
		if (disabled)
			return;
		const school = onboardingContext.draft.school;
		const normalized = normalizePeriodCount(school);
		if (normalized !== school) {
			onboardingContext.draft.school = normalized;
			persistDraft();
		}
	});

	function persistDraft() {
		onboardingContext.persist();
	}

	function bindSchoolField<K extends keyof typeof onboardingContext.draft.school>(
		field: K,
		value: (typeof onboardingContext.draft.school)[K],
	) {
		onboardingContext.draft.school[field] = value;
		persistDraft();
	}

	function handleCountryChange(value: string | undefined) {
		if (!value || !wizard.isCountryAvailable(value)) {
			return;
		}

		onboardingContext.draft.school.country = value;
		const timezone = timezoneForCountry(value);
		if (timezone) {
			onboardingContext.draft.school.timezone = timezone;
		}
		persistDraft();
	}

	function handlePeriodTypeChange(value: string | undefined) {
		if (value !== 'trimester' && value !== 'semester') {
			return;
		}

		onboardingContext.draft.school = setPeriodType(onboardingContext.draft.school, value);
		persistDraft();
	}

</script>

<div class="space-y-3">
	<section class="space-y-2">
		<h2 class="text-sm font-medium text-foreground">{$t('onboarding.schoolSection.identity')}</h2>
		<div class="grid gap-2 sm:grid-cols-2">
			<div class="grid content-start gap-1 sm:col-span-2">
				<Label for="onboarding-school-name">{$t('onboarding.schoolNameLabel')}</Label>
				<Input
					id="onboarding-school-name"
					bind:value={onboardingContext.draft.school.name}
					placeholder={$t('onboarding.schoolNamePlaceholder')}
					{disabled}
					oninput={persistDraft}
				/>
			</div>
			<ShortNameField name={onboardingContext.draft.school.name} bind:value={onboardingContext.draft.school.shortName} {disabled} />
			<div class="grid content-start gap-1">
				<Label for="onboarding-school-city">{$t('onboarding.cityLabel')}</Label>
				<Input
					id="onboarding-school-city"
					bind:value={onboardingContext.draft.school.city}
					placeholder={$t('onboarding.cityPlaceholder')}
					{disabled}
					oninput={persistDraft}
				/>
			</div>
			<div class="grid content-start gap-1">
				<Label for="onboarding-school-country">{$t('onboarding.countryLabel')}</Label>
				<Select.Root
					type="single"
					value={onboardingContext.draft.school.country}
					onValueChange={handleCountryChange}
				>
					<Select.Trigger id="onboarding-school-country" class="w-full" {disabled}>
						<Select.Value placeholder={$t('onboarding.countryPlaceholder')}>
							{onboardingContext.draft.school.country}
						</Select.Value>
					</Select.Trigger>
					<Select.Content class="z-[100]">
						{#each countryOptions as country (country)}
							{@const ready = wizard.isCountryAvailable(country)}
							<Select.Item
								value={country}
								label={country}
								disabled={!ready}
								class={!ready ? 'text-muted-foreground' : undefined}
							>
								<span class="flex w-full items-center justify-between gap-2">
									<span class={ready ? 'text-foreground' : 'text-muted-foreground'}>{country}</span>
									{#if !ready}
										<span class="shrink-0 text-[11px] text-muted-foreground">
											{$t('onboarding.countryComingSoon')}
										</span>
									{/if}
								</span>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="grid content-start gap-1">
				<Label for="onboarding-finance-currency">Devise financière (ISO 4217)</Label>
				<Input id="onboarding-finance-currency" bind:value={onboardingContext.draft.school.financeCurrency} maxlength={3} placeholder="EUR / XOF / USD" required {disabled} />
			</div>
			<div class="grid content-start gap-1">
				<Label for="onboarding-school-timezone">{$t('onboarding.timezoneLabel')}</Label>
				<Select.Root
					type="single"
					value={onboardingContext.draft.school.timezone}
					onValueChange={(value) => {
						if (value) {
							bindSchoolField('timezone', value);
						}
					}}
				>
					<Select.Trigger id="onboarding-school-timezone" class="w-full" {disabled}>
						<Select.Value placeholder={$t('onboarding.timezonePlaceholder')}>
							{selectedTimezone}
						</Select.Value>
					</Select.Trigger>
					<Select.Content class="z-[100]">
						{#each timezoneOptions as zone (zone)}
							<Select.Item value={zone} label={zone}>
								{zone}
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
	</section>

	<section class="space-y-2">
		<h2 class="text-sm font-medium text-foreground">{$t('onboarding.schoolSection.academicYear')}</h2>
		<div class="grid gap-2 sm:grid-cols-2">
			<div class="grid content-start gap-1">
				<Label for="onboarding-year-start">{$t('onboarding.startDateLabel')}</Label>
				<Input
					id="onboarding-year-start"
					type="date"
					bind:value={onboardingContext.draft.school.academicYearStart}
					{disabled}
					oninput={persistDraft}
				/>
			</div>
			<div class="grid content-start gap-1">
				<Label for="onboarding-year-end">{$t('onboarding.endDateLabel')}</Label>
				<Input
					id="onboarding-year-end"
					type="date"
					bind:value={onboardingContext.draft.school.academicYearEnd}
					{disabled}
					oninput={persistDraft}
				/>
			</div>
		</div>
	</section>

	<section class="space-y-2">
		<h2 class="text-sm font-medium text-foreground">{$t('onboarding.schoolSection.period')}</h2>
		<fieldset disabled={disabled} aria-labelledby="onboarding-period-type-label">
			<legend id="onboarding-period-type-label" class="mb-1 text-sm font-medium">{$t('onboarding.periodTypeLabel')}</legend>
			<div class="flex flex-wrap items-center gap-x-6 gap-y-2">
				{#each periodTypes as entry (entry.value)}
					<label class="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-50">
						<input
							type="radio"
							name="onboarding-period-type"
							value={entry.value}
							checked={onboardingContext.draft.school.periodType === entry.value}
							class="control-focus size-4 accent-primary"
							onchange={() => handlePeriodTypeChange(entry.value)}
						/>
						{$t(entry.labelKey)}
					</label>
				{/each}
			</div>
		</fieldset>

		<p class="text-xs text-muted-foreground">
			{$t('onboarding.periods.hint', {
				max: periodCount(onboardingContext.draft.school.periodType),
			})}
		</p>

		<div class="space-y-2">
			{#each onboardingContext.draft.school.periods as period, index (period.id)}
				<article class="rounded-collection border border-border bg-secondary/20 p-3">
					<div class="mb-2 flex items-center justify-between gap-2">
						<p class="text-sm font-medium text-foreground">
							{$t('onboarding.periods.itemTitle', { index: index + 1 })}
						</p>
					</div>
					<div class="grid gap-2 sm:grid-cols-3">
						<div class="grid content-start gap-1">
							<Label for={`onboarding-period-label-${period.id}`}>{$t('onboarding.periodLabel')}</Label>
							<Input
								id={`onboarding-period-label-${period.id}`}
								value={catalogPeriodLabel(period.label, $lang)}
								placeholder={$t('onboarding.periodPlaceholder')}
								{disabled}
								oninput={(event) => {
									period.label = toCanonicalCatalogText(event.currentTarget.value);
									persistDraft();
								}}
							/>
						</div>
						<div class="grid content-start gap-1">
							<Label for={`onboarding-period-start-${period.id}`}>{$t('onboarding.startDateLabel')}</Label>
							<Input
								id={`onboarding-period-start-${period.id}`}
								type="date"
								bind:value={period.start}
								{disabled}
								oninput={persistDraft}
							/>
						</div>
						<div class="grid content-start gap-1">
							<Label for={`onboarding-period-end-${period.id}`}>{$t('onboarding.endDateLabel')}</Label>
							<Input
								id={`onboarding-period-end-${period.id}`}
								type="date"
								bind:value={period.end}
								{disabled}
								oninput={persistDraft}
							/>
						</div>
					</div>
				</article>
			{/each}
		</div>

		{#if !periodDatesValid}
			<p class="text-xs text-destructive">
				{$t('onboarding.schoolStep.dateRangeHint')}
			</p>
		{/if}
	</section>

	{#if onboardingContext.draft.schoolStepSubmitted}
		<p class="rounded-collection bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground">
			{$t('onboarding.schoolStep.alreadySubmitted')}
		</p>
	{/if}
</div>

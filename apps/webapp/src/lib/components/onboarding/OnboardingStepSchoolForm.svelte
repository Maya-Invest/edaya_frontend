<script lang="ts">

	import Button from '$lib/components/ui/button/button.svelte';

	import Input from '$lib/components/ui/input/input.svelte';

	import Label from '$lib/components/ui/label/label.svelte';

	import * as Select from '$lib/components/ui/select';

	import { t } from '$lib/i18n';

	import { Plus, Trash2 } from '$lib/icons';

	import { onboardingContext } from '$lib/onboarding/context.svelte';

	import {

		addPeriod,

		canAddPeriod,

		maxPeriodCount,

		removePeriod,

		setPeriodType,

	} from '$lib/onboarding/school-periods';

	import {
		COMMON_TIMEZONES,
		ONBOARDING_COUNTRIES,
		optionsWithCurrent,
		timezoneForCountry,
	} from '$lib/onboarding/school-step-defaults';

	import { periodFitsInAcademicYear } from '$lib/onboarding/school-step-validation';

	interface Props {

		disabled?: boolean;

	}

	const { disabled = false }: Props = $props();

	const periodTypes = [

		{ value: 'trimester', labelKey: 'onboarding.periodType.trimester' as const },

		{ value: 'semester', labelKey: 'onboarding.periodType.semester' as const },

	];

	const periodTypeLabel = $derived(
		periodTypes.find(entry => entry.value === onboardingContext.draft.school.periodType)?.labelKey	?? 'onboarding.periodType.trimester',
	);

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

	const showAddPeriod = $derived(canAddPeriod(onboardingContext.draft.school));

	const addPeriodLabelKey = $derived(

		onboardingContext.draft.school.periodType === 'trimester'

			? 'onboarding.periods.addTrimester'

			: 'onboarding.periods.addSemester',

	);

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
		if (!value) {
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

	function handleAddPeriod() {
		onboardingContext.draft.school = addPeriod(onboardingContext.draft.school);

		persistDraft();
	}

	function handleRemovePeriod(periodId: string) {
		onboardingContext.draft.school = removePeriod(onboardingContext.draft.school, periodId);

		persistDraft();
	}

</script>

<div class="space-y-6">

	<section class="space-y-3">

		<h2 class="text-sm font-medium text-foreground">{$t('onboarding.schoolSection.identity')}</h2>

		<div class="grid gap-3 sm:grid-cols-2">

			<div class="space-y-1.5 sm:col-span-2">

				<Label for="onboarding-school-name">{$t('onboarding.schoolNameLabel')}</Label>

				<Input

					id="onboarding-school-name"

					bind:value={onboardingContext.draft.school.name}

					placeholder={$t('onboarding.schoolNamePlaceholder')}

					{disabled}

					oninput={persistDraft}

				/>

			</div>

			<div class="space-y-1.5">

				<Label for="onboarding-school-city">{$t('onboarding.cityLabel')}</Label>

				<Input

					id="onboarding-school-city"

					bind:value={onboardingContext.draft.school.city}

					placeholder={$t('onboarding.cityPlaceholder')}

					{disabled}

					oninput={persistDraft}

				/>

			</div>

			<div class="space-y-1.5">

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

							<Select.Item value={country} label={country}>

								{country}

							</Select.Item>

						{/each}

					</Select.Content>

				</Select.Root>

			</div>

			<div class="space-y-1.5 sm:col-span-2">

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

	<section class="space-y-3">

		<h2 class="text-sm font-medium text-foreground">{$t('onboarding.schoolSection.academicYear')}</h2>

		<div class="grid gap-3 sm:grid-cols-3">

			<div class="space-y-1.5 sm:col-span-3">

				<Label for="onboarding-year-label">{$t('onboarding.academicYearLabel')}</Label>

				<Input

					id="onboarding-year-label"

					bind:value={onboardingContext.draft.school.academicYearLabel}

					placeholder={$t('onboarding.academicYearPlaceholder')}

					{disabled}

					oninput={persistDraft}

				/>

			</div>

			<div class="space-y-1.5">

				<Label for="onboarding-year-start">{$t('onboarding.startDateLabel')}</Label>

				<Input

					id="onboarding-year-start"

					type="date"

					bind:value={onboardingContext.draft.school.academicYearStart}

					{disabled}

					oninput={persistDraft}

				/>

			</div>

			<div class="space-y-1.5">

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

	<section class="space-y-3">

		<div class="flex flex-wrap items-center justify-between gap-2">

			<h2 class="text-sm font-medium text-foreground">{$t('onboarding.schoolSection.period')}</h2>

			<div class="min-w-[10rem] space-y-1.5">

				<Label class="sr-only">{$t('onboarding.periodTypeLabel')}</Label>

				<Select.Root

					type="single"

					value={onboardingContext.draft.school.periodType}

					onValueChange={handlePeriodTypeChange}

				>

					<Select.Trigger class="w-full" {disabled}>

						<Select.Value placeholder={$t('onboarding.periodTypeLabel')}>

							{$t(periodTypeLabel)}

						</Select.Value>

					</Select.Trigger>

					<Select.Content class="z-[100]">

						{#each periodTypes as entry (entry.value)}

							<Select.Item value={entry.value} label={$t(entry.labelKey)}>

								{$t(entry.labelKey)}

							</Select.Item>

						{/each}

					</Select.Content>

				</Select.Root>

			</div>

		</div>

		<p class="text-xs text-muted-foreground">

			{$t('onboarding.periods.hint', {

				max: maxPeriodCount(onboardingContext.draft.school.periodType),

			})}

		</p>

		<div class="space-y-3">

			{#each onboardingContext.draft.school.periods as period, index (period.id)}

				<article class="rounded-xl border border-border bg-secondary/20 p-4">

					<div class="mb-3 flex items-center justify-between gap-2">

						<p class="text-sm font-medium text-foreground">

							{$t('onboarding.periods.itemTitle', { index: index + 1 })}

						</p>

						{#if index > 0}

							<Button

								type="button"

								variant="ghost"

								size="sm"

								class="h-8 text-destructive hover:text-destructive"

								{disabled}

								onclick={() => handleRemovePeriod(period.id)}

							>

								<Trash2 class="mr-1 h-3.5 w-3.5" />

								{$t('onboarding.periods.remove')}

							</Button>

						{/if}

					</div>

					<div class="grid gap-3 sm:grid-cols-3">

						<div class="space-y-1.5 sm:col-span-3">

							<Label for={`onboarding-period-label-${period.id}`}>{$t('onboarding.periodLabel')}</Label>

							<Input

								id={`onboarding-period-label-${period.id}`}

								bind:value={period.label}

								placeholder={$t('onboarding.periodPlaceholder')}

								{disabled}

								oninput={persistDraft}

							/>

						</div>

						<div class="space-y-1.5">

							<Label for={`onboarding-period-start-${period.id}`}>{$t('onboarding.startDateLabel')}</Label>

							<Input

								id={`onboarding-period-start-${period.id}`}

								type="date"

								bind:value={period.start}

								{disabled}

								oninput={persistDraft}

							/>

						</div>

						<div class="space-y-1.5">

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

		{#if showAddPeriod}

			<Button type="button" variant="outline" class="w-full sm:w-auto" {disabled} onclick={handleAddPeriod}>

				<Plus class="mr-2 h-4 w-4" />

				{$t(addPeriodLabelKey, { number: onboardingContext.draft.school.periods.length + 1 })}

			</Button>

		{/if}

		{#if !periodDatesValid}

			<p class="text-xs text-destructive">

				{$t('onboarding.schoolStep.dateRangeHint')}

			</p>

		{/if}

	</section>

	{#if onboardingContext.draft.schoolStepSubmitted}

		<p class="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">

			{$t('onboarding.schoolStep.alreadySubmitted')}

		</p>

	{/if}

</div>

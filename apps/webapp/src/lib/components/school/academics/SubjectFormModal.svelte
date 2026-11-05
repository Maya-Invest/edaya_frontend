<script lang="ts">
	import type { createScheduleMutation } from '$lib/api/mutations/schedule.mutations';
	import type { createSubjectForClassMutation, updateSubjectMutation } from '$lib/api/mutations/subject.mutations';
	import type { SubjectCategoryOption } from '$lib/api/subject-categories-data';
	import type { PlanningEvent, Subject } from '$lib/types/school';
	import { defaultSubjectCategoryId } from '$lib/api/subject-categories-data';
	import { authSession } from '$lib/auth/session.svelte';
	import SubjectTypeField from '$lib/components/school/academics/SubjectTypeField.svelte';
	import ShortNameField from '$lib/components/school/shared/ShortNameField.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { lang, t } from '$lib/i18n';
	import { catalogCategory } from '$lib/i18n/catalog-label';
	import AcademicDisciplinePicker from '$lib/smart-components/reference-catalog/AcademicDisciplinePicker.svelte';
	import { parseSubjectWorkload } from '$lib/subjects/subject-workload';
	import { get } from 'svelte/store';

	const PLANNING_DAYS: PlanningEvent['day'][] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
	const COLORS: Subject['color'][] = ['mint', 'sky', 'warm'];
	const COLOR_LABELS: Record<Subject['color'], string> = {
		mint: 'Mint',
		sky: 'Sky',
		warm: 'Warm',
	};
	let { reportModules = [], canConfigureModule = false, reportConfigurationRevision, onLoadParticipationRevisions, onLoadCategories, onCreateSchedule, onCreateSubjectForClass, onUpdateSubject, subject, classId, weekStart = new Date(), open = $bindable(false), onCreated, disabled = false, title, showTrigger = true }: {
		reportModules?: { id: string; name: string }[];
		canConfigureModule?: boolean;
		reportConfigurationRevision?: number;
		onLoadParticipationRevisions: (subjectId: string) => Promise<Record<string, number>>;
		onLoadCategories: (schoolId: string) => Promise<SubjectCategoryOption[]>;
		onCreateSchedule: typeof createScheduleMutation;
		onCreateSubjectForClass: typeof createSubjectForClassMutation;
		onUpdateSubject: typeof updateSubjectMutation;
		subject?: Subject;
		classId?: string;
		weekStart?: Date;
		open?: boolean;
		onCreated?: (classSubjectId: string) => void;
		disabled?: boolean;
		title?: string;
		showTrigger?: boolean;
	} = $props();
	let expectedParticipationRevisions = $state<Record<string, number> | undefined>();
	let policyLoadError = $state('');
	let busy = $state(false);
	let wasOpen = $state(false);
	let name = $state('');
	let disciplineId = $state('');
	let shortName = $state('');
	let coefficient = $state('');
	let reportModuleId = $state('ungrouped');
	let capturedReportRevision: number | undefined;
	let isOptional = $state(false);
	let periodsPerWeek = $state('');
	let minPeriodSpan = $state('');
	let maxPeriodSpan = $state('');
	let workloadError = $state('');
	let categories = $state<SubjectCategoryOption[]>([]);
	let categoryId = $state('');
	let color = $state<Subject['color']>('mint');
	let addToTimetable = $state(false);
	let scheduleDay = $state<PlanningEvent['day']>('Mon');
	let scheduleStart = $state('08:00');
	let scheduleEnd = $state('09:00');
	const isEdit = $derived(subject !== undefined);
	const hasSharedWorkload = $derived(Boolean(subject?.gradeLevelId));
	const colorLabel = $derived(COLOR_LABELS[color]);
	const canSubmit = $derived.by(() => {
		return (!isEdit || expectedParticipationRevisions !== undefined) && ((isEdit && !subject?.disciplineId) || disciplineId.length > 0) && (coefficient === '' || (Number.isFinite(Number(coefficient)) && Number(coefficient) > 0)) && name.trim().length > 0 && categoryId.length > 0 && (isEdit || (classId?.length ?? 0) > 0);
	});
	const selectedCategoryName = $derived(categories.find(category => category.id === categoryId)?.name ?? '');
	async function loadCategories() {
		const schoolId = authSession.schoolId;
		if (!schoolId) {
			categories = [];
			return;
		}
		categories = await onLoadCategories(schoolId);
		if (!categories.some(category => category.id === categoryId)) {
			categoryId = subject?.categoryId || defaultSubjectCategoryId(categories);
		}
	}
	function resetForm() {
		workloadError = '';
		disciplineId = subject?.disciplineId ?? '';
		shortName = subject?.shortName ?? '';
		coefficient = subject?.coefficient == null ? '' : String(subject.coefficient);
		reportModuleId = subject?.reportModuleId ?? 'ungrouped';
		capturedReportRevision = reportConfigurationRevision;
		isOptional = subject?.isOptional ?? false;
		periodsPerWeek = subject?.periodsPerWeek != null ? String(subject.periodsPerWeek) : '';
		minPeriodSpan = subject?.minPeriodSpan != null ? String(subject.minPeriodSpan) : '';
		maxPeriodSpan = subject?.maxPeriodSpan != null ? String(subject.maxPeriodSpan) : '';
		if (subject) {
			name = subject.name;
			categoryId = subject.categoryId;
			color = subject.color;
		}
		else {
			name = '';
			categoryId = defaultSubjectCategoryId(categories);
			color = 'mint';
			addToTimetable = false;
			scheduleDay = 'Mon';
			scheduleStart = '08:00';
			scheduleEnd = '09:00';
		}
	}
	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
			void loadCategories();
			expectedParticipationRevisions = undefined;
			policyLoadError = '';
			if (subject) {
				void onLoadParticipationRevisions(subject.subjectId ?? subject.id).then((value) => {
					expectedParticipationRevisions = value;
				}).catch((error) => {
					policyLoadError = error instanceof Error ? error.message : String(error);
				});
			}
		}
		wasOpen = open;
	});
	async function submit() {
		if (!canSubmit || busy)
			return;
		const workload = hasSharedWorkload ? parseSubjectWorkload({ periodsPerWeek, minPeriodSpan, maxPeriodSpan }) : undefined;
		workloadError = workload?.error ? get(t)(workload.error) : '';
		if (workloadError)
			return;
		busy = true;
		try {
			if (subject) {
				const ok = await onUpdateSubject({
					classSubjectId: subject.id,
					expectedParticipationRevisions,
					...(canConfigureModule ? { reportModuleId: reportModuleId === 'ungrouped' ? null : reportModuleId, expectedReportConfigurationRevision: capturedReportRevision } : {}),
					subjectId: hasSharedWorkload ? subject.id : undefined,
					...workload?.value,
					name,
					disciplineId: disciplineId || null,
					shortName: shortName.trim() || undefined,
					coefficient: coefficient ? Number(coefficient) : null,
					isOptional,
					categoryId,
					color,
					successMessage: get(t)('subjects.updateSuccess', { name: name.trim() }),
				});
				if (ok) {
					open = false;
				}
			}
			else if (classId) {
				const classSubjectId = await onCreateSubjectForClass({
					classGroupId: classId,
					name,
					disciplineId: disciplineId || null,
					shortName: shortName.trim() || undefined,
					coefficient: coefficient ? Number(coefficient) : null,
					isOptional,
					categoryId,
					color,
					successMessage: get(t)('subjects.createSuccess', { name: name.trim() }),
				});
				if (classSubjectId) {
					if (addToTimetable) {
						await onCreateSchedule({
							classGroupId: classId,
							scheduleKind: 'lesson',
							title: name.trim(),
							classSubjectId,
							day: scheduleDay,
							startTime: scheduleStart,
							endTime: scheduleEnd,
							weekStart,
						});
					}
					open = false;
					resetForm();
					onCreated?.(classSubjectId);
				}
			}
		}
		finally {
			busy = false;
		}
	}
</script>

{#if isEdit && showTrigger}
	<Button
		variant="outline"
		size="sm"

		{disabled}
		{title}
		onclick={() => (open = true)}
	>
		{$t('common.edit')}
	</Button>
{/if}

<FormModal contentClass="max-w-3xl"
	bind:open
	title={isEdit ? $t('subjects.editTitle') : $t('subjects.createTitle')}
	description={isEdit ? subject?.name : $t('subjects.createDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	{#if policyLoadError}<p class="text-destructive">{policyLoadError}</p>{/if}
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('subjects.name')}
		</Label>
		<Input bind:value={name} />
	</div>
	<SubjectTypeField bind:isOptional />
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('subjects.category')}
			</Label>
			<Select.Root type="single" value={categoryId} onValueChange={value => value && (categoryId = value)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('subjects.category')}>
						{catalogCategory(selectedCategoryName, $lang)}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each categories as category (category.id)}
						<Select.Item value={category.id} label={catalogCategory(category.name, $lang)}>
							{catalogCategory(category.name, $lang)}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('subjects.color')}
			</Label>
			<Select.Root type="single" value={color} onValueChange={v => v && (color = v as Subject['color'])}>
				<Select.Trigger>
					<Select.Value placeholder={$t('subjects.color')}>
						{colorLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each COLORS as c (c)}
						<Select.Item value={c} label={COLOR_LABELS[c]}>{COLOR_LABELS[c]}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>
	{#if hasSharedWorkload}
		<fieldset class="space-y-3">
			<legend class="text-sm font-medium">{$t('timetable.classSubjectTimetableTitle')}</legend>
			<p class="text-xs text-muted-foreground">{$t('subjects.workload.sharedHint')}</p>
			<div class="grid gap-3 sm:grid-cols-3">
				<label class="space-y-1.5 text-xs">
					<span>{$t('timetable.periodsPerWeek')}</span>
					<Input type="number" min="1" step="1" bind:value={periodsPerWeek} placeholder="—" />
				</label>
				<label class="space-y-1.5 text-xs">
					<span>{$t('timetable.minPeriodSpan')}</span>
					<Input type="number" min="1" step="1" bind:value={minPeriodSpan} placeholder="—" />
				</label>
				<label class="space-y-1.5 text-xs">
					<span>{$t('timetable.maxPeriodSpan')}</span>
					<Input type="number" min="1" step="1" bind:value={maxPeriodSpan} placeholder="—" />
				</label>
			</div>
			<p class="text-xs text-muted-foreground">{$t('subjects.workload.defaultsHint')}</p>
			{#if workloadError}
				<p class="text-xs text-destructive" role="alert">{workloadError}</p>
			{/if}
		</fieldset>
	{/if}
	{#if !isEdit && classId}
		<div class="space-y-3 rounded-collection border border-border bg-secondary/20 p-4">
			<label class="flex items-center gap-2 text-sm">
				<Checkbox bind:checked={addToTimetable} />
				{$t('eval.addToTimetable')}
			</label>
			{#if addToTimetable}
				<div class="space-y-1.5">
					<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						{$t('planning.day')}
					</Label>
					<Select.Root type="single" value={scheduleDay} onValueChange={v => v && (scheduleDay = v as PlanningEvent['day'])}>
						<Select.Trigger>
							<Select.Value placeholder={$t('planning.day')}>
								{$t(`day.full.${scheduleDay}`)}
							</Select.Value>
						</Select.Trigger>
						<Select.Content class="z-[100]">
							{#each PLANNING_DAYS as d (d)}
								<Select.Item value={d} label={$t(`day.full.${d}`)}>{$t(`day.full.${d}`)}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							{$t('drawer.start')}
						</Label>
						<Input type="time" bind:value={scheduleStart} />
					</div>
					<div class="space-y-1.5">
						<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							{$t('drawer.end')}
						</Label>
						<Input type="time" bind:value={scheduleEnd} />
					</div>
				</div>
			{/if}
		</div>
	{/if}
	<Label class="block space-y-2"><span>{$t('profile.discipline')}</span><AcademicDisciplinePicker bind:value={disciplineId} active={open} /></Label>
	<ShortNameField {name} bind:value={shortName} creating={!isEdit} />
	{#if canConfigureModule}<Label class="block space-y-2"><span>{$t('modules.module')}</span><Select.Root type="single" bind:value={reportModuleId}><Select.Trigger><Select.Value>{reportModules.find(module => module.id === reportModuleId)?.name ?? $t('modules.ungrouped')}</Select.Value></Select.Trigger><Select.Content><Select.Item value="ungrouped">{$t('modules.ungrouped')}</Select.Item>{#each reportModules as module (module.id)}<Select.Item value={module.id}>{module.name}</Select.Item>{/each}</Select.Content></Select.Root></Label>{/if}

	<Label class="block space-y-2"><span>{$t('eval.coefficient')}</span><Input type="number" min="0" step="any" bind:value={coefficient} /></Label>
</FormModal>

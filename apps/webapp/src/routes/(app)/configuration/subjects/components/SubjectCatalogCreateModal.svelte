<script lang="ts">
	import type { Subject, SubjectCategory } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import { sortGradeLevels } from '$lib/academic/grade-level-sort';
	import { createSubjectForGradeLevelMutation } from '$lib/api/mutations/subject.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getSubjectsPageState } from '../subjects-page.svelte';

	const CATEGORIES: SubjectCategory[] = [
		'Scientifique',
		'Littéraire',
		'Langues',
		'Sciences humaines',
		'Sport',
		'Arts',
	];
	const COLORS: Subject['color'][] = ['mint', 'sky', 'warm'];

	const COLOR_LABELS: Record<Subject['color'], string> = {
		mint: 'Mint',
		sky: 'Sky',
		warm: 'Warm',
	};

	let {
		open = $bindable(false),
		defaultGradeLevelId = 'all',
		onCreated,
	}: {
		open?: boolean;
		defaultGradeLevelId?: string;
		onCreated?: () => void;
	} = $props();

	const subjectsPage = getSubjectsPageState();

	let busy = $state(false);
	let wasOpen = $state(false);
	let name = $state('');
	let gradeLevelId = $state('');
	let category = $state<SubjectCategory>('Scientifique');
	let color = $state<Subject['color']>('mint');

	const gradeLevelOptions = $derived(
		sortGradeLevels(academicContext.gradeLevels).map(level => ({
			value: level.id,
			label: level.name,
		})),
	);
	const colorLabel = $derived(COLOR_LABELS[color]);
	const canSubmit = $derived(name.trim().length > 0 && gradeLevelId.length > 0 && (academicContext.yearId?.length ?? 0) > 0);

	function resetForm() {
		name = '';
		category = 'Scientifique';
		color = 'mint';
		const levels = sortGradeLevels(academicContext.gradeLevels);
		if (defaultGradeLevelId !== 'all' && levels.some(level => level.id === defaultGradeLevelId)) {
			gradeLevelId = defaultGradeLevelId;
		}
		else {
			gradeLevelId = levels[0]?.id ?? '';
		}
	}

	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
		}
		wasOpen = open;
	});

	async function submit() {
		if (!canSubmit) {
			return;
		}

		const classGroupIds = academicContext.classes
			.filter(classGroup => classGroup.gradeLevelId === gradeLevelId)
			.map(classGroup => classGroup.id);
		const academicYearId = academicContext.yearId ?? '';

		busy = true;
		const classSubjectId = await createSubjectForGradeLevelMutation({
			gradeLevelId,
			academicYearId,
			classGroupIds,
			name: name.trim(),
			category,
			color,
			successMessage: get(t)('subjects.createSuccess', { name: name.trim() }),
		});
		busy = false;

		if (classSubjectId) {
			open = false;
			await subjectsPage.refreshSlice();
			onCreated?.();
		}
	}
</script>

<FormModal
	bind:open
	title={$t('subjects.createTitle')}
	description={$t('subjects.createDescription')}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('subjects.gradeLevel')}
		</Label>
		<Select.Root
			type="single"
			value={gradeLevelId}
			onValueChange={value => value && (gradeLevelId = value)}
		>
			<Select.Trigger>
				<Select.Value placeholder={$t('subjects.gradeLevel')}>
					{gradeLevelOptions.find(option => option.value === gradeLevelId)?.label ?? $t('subjects.gradeLevel')}
				</Select.Value>
			</Select.Trigger>
			<Select.Content class="z-[100]">
				{#each gradeLevelOptions as option (option.value)}
					<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
	<div class="space-y-1.5">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('subjects.name')}
		</Label>
		<Input bind:value={name} />
	</div>
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('subjects.category')}
			</Label>
			<Select.Root type="single" value={category} onValueChange={value => value && (category = value as SubjectCategory)}>
				<Select.Trigger>
					<Select.Value placeholder={$t('subjects.category')}>
						{category}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each CATEGORIES as cat (cat)}
						<Select.Item value={cat} label={cat}>{cat}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="space-y-1.5">
			<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{$t('subjects.color')}
			</Label>
			<Select.Root type="single" value={color} onValueChange={value => value && (color = value as Subject['color'])}>
				<Select.Trigger>
					<Select.Value placeholder={$t('subjects.color')}>
						{colorLabel}
					</Select.Value>
				</Select.Trigger>
				<Select.Content class="z-[100]">
					{#each COLORS as entry (entry)}
						<Select.Item value={entry} label={COLOR_LABELS[entry]}>{COLOR_LABELS[entry]}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>
</FormModal>

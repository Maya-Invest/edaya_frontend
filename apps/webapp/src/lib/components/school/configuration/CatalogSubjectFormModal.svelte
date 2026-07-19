<script lang="ts">
	import type { Subject, SubjectCategory } from '$lib/types/school';
	import { updateCatalogSubjectMutation } from '$lib/api/mutations/catalog-subject.mutations';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

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
		subject,
		open = $bindable(false),
	}: {
		subject: Subject;
		open?: boolean;
	} = $props();

	let busy = $state(false);
	let wasOpen = $state(false);
	let name = $state('');
	let category = $state<SubjectCategory>('Scientifique');
	let color = $state<Subject['color']>('mint');

	const colorLabel = $derived(COLOR_LABELS[color]);
	const canSubmit = $derived(name.trim().length > 0);

	function resetForm() {
		name = subject.name;
		category = subject.category;
		color = subject.color;
	}

	$effect(() => {
		if (open && !wasOpen) {
			resetForm();
		}
		wasOpen = open;
	});

	async function submit() {
		if (!canSubmit || busy) {
			return;
		}

		busy = true;
		const ok = await updateCatalogSubjectMutation({
			gradeLevelSubjectId: subject.id,
			name,
			category,
			color,
			successMessage: get(t)('subjects.updateSuccess', { name: name.trim() }),
		});
		busy = false;
		if (ok) {
			open = false;
		}
	}
</script>

<FormModal
	bind:open
	title={$t('subjects.editTitle')}
	description={subject.name}
	submitLabel={$t('common.save')}
	busy={busy}
	submitDisabled={!canSubmit}
	onCancel={resetForm}
	onSubmit={submit}
>
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
			<Select.Root type="single" value={category} onValueChange={v => v && (category = v as SubjectCategory)}>
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
</FormModal>

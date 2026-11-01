<script lang="ts">
	import type { DisciplinaryActionCatalogItem, DisciplinaryActionKind } from '$lib/types/discipline';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getDisciplinePageState } from '../discipline-page.svelte';

	let {
		open = $bindable(false),
		action = null,
	}: {
		open?: boolean;
		action?: DisciplinaryActionCatalogItem | null;
	} = $props();

	const disciplinePage = getDisciplinePageState();

	let busy = $state(false);
	let name = $state('');
	let kind = $state<DisciplinaryActionKind>('sanction');
	let severity = $state('');
	let defaultDurationDays = $state('');
	let description = $state('');

	const isEdit = $derived(action !== null && action !== undefined);
	const canSubmit = $derived(name.trim().length > 0);

	function kindLabel(value: DisciplinaryActionKind): string {
		return value === 'reward'
			? get(t)('disciplinaryCatalog.kindReward')
			: get(t)('disciplinaryCatalog.kindSanction');
	}

	function optionalNumber(value: string | number): number | undefined {
		const raw = String(value ?? '').trim();
		if (!raw) {
			return undefined;
		}
		const parsed = Number(raw);
		return Number.isFinite(parsed) ? parsed : undefined;
	}

	function resetForm() {
		if (action) {
			name = action.name;
			kind = action.kind;
			severity = action.severity !== undefined ? String(action.severity) : '';
			defaultDurationDays = action.defaultDurationDays !== undefined
				? String(action.defaultDurationDays)
				: '';
			description = action.description ?? '';
			return;
		}
		name = '';
		kind = 'sanction';
		severity = '';
		defaultDurationDays = '';
		description = '';
	}

	$effect(() => {
		if (open) {
			resetForm();
		}
	});

	async function submit() {
		if (!canSubmit || busy) {
			return;
		}

		busy = true;
		try {
			const trimmedName = name.trim();
			const payload = {
				name: trimmedName,
				kind,
				severity: optionalNumber(severity),
				defaultDurationDays: optionalNumber(defaultDurationDays),
				description: description.trim() || undefined,
			};

			const ok = isEdit && action
				? await disciplinePage.saveAction({
					id: action.id,
					...payload,
					successMessage: get(t)('disciplinaryCatalog.toastUpdated', { name: trimmedName }),
				})
				: await disciplinePage.saveAction({
					...payload,
					successMessage: get(t)('disciplinaryCatalog.toastCreated', { name: trimmedName }),
				});

			if (ok) {
				open = false;
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={isEdit ? $t('disciplinaryCatalog.editTitle') : $t('disciplinaryCatalog.add')}
	description={isEdit ? action?.name : $t('disciplinaryCatalog.subtitle')}
	submitLabel={$t('academic.save')}
	cancelLabel={$t('academic.cancel')}
	{busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<label class="grid gap-1 text-sm">
		<span class="text-muted-foreground">{$t('disciplinaryCatalog.name')}</span>
		<Input bind:value={name} />
	</label>
	<label class="grid gap-1 text-sm">
		<span class="text-muted-foreground">{$t('disciplinaryCatalog.kind')}</span>
		<Select.Root type="single" value={kind} onValueChange={v => v && (kind = v as DisciplinaryActionKind)}>
			<Select.Trigger class="w-full">
				<Select.Value placeholder={$t('disciplinaryCatalog.kind')}>
					{kindLabel(kind)}
				</Select.Value>
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="sanction" label={$t('disciplinaryCatalog.kindSanction')}>
					{$t('disciplinaryCatalog.kindSanction')}
				</Select.Item>
				<Select.Item value="reward" label={$t('disciplinaryCatalog.kindReward')}>
					{$t('disciplinaryCatalog.kindReward')}
				</Select.Item>
			</Select.Content>
		</Select.Root>
	</label>
	<label class="grid gap-1 text-sm">
		<span class="text-muted-foreground">{$t('disciplinaryCatalog.severity')}</span>
		<Input bind:value={severity} type="number" min="1" step="1" />
	</label>
	<label class="grid gap-1 text-sm">
		<span class="text-muted-foreground">{$t('disciplinaryCatalog.defaultDurationDays')}</span>
		<Input bind:value={defaultDurationDays} type="number" min="1" step="1" />
	</label>
	<label class="grid gap-1 text-sm">
		<span class="text-muted-foreground">{$t('disciplinaryCatalog.description')}</span>
		<Input bind:value={description} />
	</label>
</FormModal>

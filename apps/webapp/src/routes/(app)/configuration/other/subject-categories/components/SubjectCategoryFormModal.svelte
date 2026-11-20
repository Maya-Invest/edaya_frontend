<script lang="ts">
	import type { SubjectCategoryOption } from '$lib/api/subject-categories-data';
	import ShortNameField from '$lib/components/school/shared/ShortNameField.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';
	import { getSubjectCategoriesPageState } from '../subject-categories-page.svelte';

	let {
		open = $bindable(false),
		category = null,
	}: {
		open?: boolean;
		category?: SubjectCategoryOption | null;
	} = $props();

	const subjectCategoriesPage = getSubjectCategoriesPageState();
	const isEdit = $derived(category !== null);
	let busy = $state(false);
	let name = $state('');
	let shortName = $state('');

	$effect(() => {
		if (!open) {
			return;
		}
		name = category?.name ?? '';
		shortName = category?.shortName ?? category?.name ?? '';
	});

	const canSubmit = $derived(name.trim().length > 0);

	async function submit() {
		if (!canSubmit || busy) {
			return;
		}
		busy = true;
		try {
			const trimmed = name.trim();
			const ok = await subjectCategoriesPage.saveCategory({
				id: category?.id,
				name: trimmed,
				shortName,
				successMessage: get(t)(
					isEdit ? 'subjectCategories.toastUpdated' : 'subjectCategories.toastCreated',
					{ name: trimmed },
				),
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
	title={isEdit ? $t('subjectCategories.editTitle') : $t('subjectCategories.add')}
	submitLabel={$t('common.save')}
	cancelLabel={$t('common.cancel')}
	{busy}
	submitDisabled={!canSubmit}
	onSubmit={submit}
>
	<label class="grid gap-1 text-sm">
		<span class="text-muted-foreground">{$t('subjectCategories.name')}</span>
		<Input bind:value={name} />
	</label>
	<ShortNameField name={name} bind:value={shortName} creating={!isEdit} />
</FormModal>

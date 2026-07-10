<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { Users } from '$lib/icons';
	import { toast } from '$lib/toast.svelte';
	import { getStudentsPageState } from '../../students-page.svelte';

	let {
		s,
		open = $bindable(false),
	}: {
		s: Student;
		open?: boolean;
	} = $props();

	let target = $state('');
	let busy = $state(false);
	let wasOpen = $state(false);

	const currentClass = $derived(academicContext.classes.find(c => c.id === s.classId));
	const targetClass = $derived(academicContext.classes.find(c => c.id === target));
	const targetClassLabel = $derived(
		targetClass ? `${targetClass.name} · ${targetClass.level}` : '',
	);

	function resetForm() {
		target = s.classId;
	}

	$effect(() => {
		if (open && !wasOpen)
			resetForm();
		wasOpen = open;
	});

	const studentsPage = getStudentsPageState();

	async function confirmTransfer() {
		if (target === s.classId || !s.enrollmentId) {
			if (!s.enrollmentId) {
				toast.error('Inscription active introuvable pour cet élève.');
			}
			return;
		}

		busy = true;
		const ok = await studentsPage.transferClass({
			enrollmentId: s.enrollmentId,
			studentId: s.id,
			nextClassGroupId: target,
			successMessage: `${s.name} a été transféré(e) vers ${targetClass?.name ?? 'la nouvelle classe'}.`,
		});
		busy = false;
		if (ok) {
			open = false;
		}
	}
</script>

<Button variant="outline" size="sm" class="gap-2 rounded-full" onclick={() => (open = true)}>
	<Users class="h-3.5 w-3.5" />
	Changer de classe
</Button>

<FormModal
	bind:open
	title={`Changer la classe de ${s.name}`}
	description={`Classe actuelle : ${currentClass?.name ?? '—'} · ${currentClass?.level ?? ''}`}
	submitLabel="Confirmer"
	busy={busy}
	submitDisabled={target === s.classId || !s.enrollmentId}
	onSubmit={confirmTransfer}
>
	<div class="space-y-2 py-2">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			Nouvelle classe
		</Label>
		<Select.Root type="single" value={target} onValueChange={v => v && (target = v)}>
			<Select.Trigger>
				<Select.Value placeholder="Nouvelle classe">
					{targetClassLabel}
				</Select.Value>
			</Select.Trigger>
			<Select.Content class="z-[100]">
				{#each academicContext.classes as c (c.id)}
					<Select.Item value={c.id} label={c.name}>
						{c.name}
						<span class="ml-1 text-muted-foreground">· {c.level}</span>
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
		{#if targetClass && target !== s.classId}
			<p class="text-xs text-muted-foreground">
				{s.name} sera transféré(e) vers {targetClass.name}.
			</p>
		{/if}
	</div>
</FormModal>

<script lang="ts">
	import type { Student } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { Users } from '$lib/icons';
	import { toast } from '$lib/toast.svelte';
	import { get } from 'svelte/store';
	import { getStudentEnrollmentsTabState } from '../(tabs)/enrollments/student-enrollments-tab.svelte';

	let {
		s,
		open = $bindable(false),
	}: {
		s: Student;
		open?: boolean;
	} = $props();

	let target = $state('');
	let unsupported = $state<{ subjectId: string; name: string }[]>([]);
	let acknowledged = $state(false);
	let previewReady = $state(false);
	let previewError = $state('');
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

	const enrollmentsTab = getStudentEnrollmentsTabState();
	$effect(() => {
		const destination = target;
		const studentId = s.id;
		const enrollmentId = s.enrollmentId;
		previewReady = false;
		acknowledged = false;
		previewError = '';
		let cancelled = false;
		if (open && enrollmentId && destination !== s.classId) {
			void enrollmentsTab.previewTransfer(studentId, enrollmentId, destination).then((rows) => {
				if (!cancelled) {
					unsupported = rows;
					previewReady = true;
				}
			}).catch((error) => {
				if (!cancelled)
					previewError = error instanceof Error ? error.message : String(error);
			});
		}
		return () => {
			cancelled = true;
		};
	});

	async function confirmTransfer() {
		if (target === s.classId || !s.enrollmentId) {
			if (!s.enrollmentId) {
				toast.error(get(t)('student.noActiveEnrollment'));
			}
			return;
		}

		busy = true;
		const ok = await enrollmentsTab.transferClass({
			enrollmentId: s.enrollmentId,
			studentId: s.id,
			nextClassGroupId: target,
			acknowledgedDroppedSubjectIds: acknowledged ? unsupported.map(row => row.subjectId) : [],
			successMessage: get(t)('student.transferSuccess', {
				name: s.name,
				class: targetClass?.name ?? get(t)('student.newClass'),
			}),
		});
		busy = false;
		if (ok) {
			open = false;
		}
	}
</script>

<Button variant="outline" size="sm" class="gap-2" onclick={() => (open = true)}>
	<Users class="h-3.5 w-3.5" />
	{$t('student.changeClass')}
</Button>

<FormModal
	bind:open
	title={$t('student.changeClassTitle', { name: s.name })}
	description={$t('student.currentClass', {
		name: currentClass?.name ?? '—',
		level: currentClass?.level ?? '',
	})}
	submitLabel={$t('common.confirm')}
	busy={busy}
	submitDisabled={target === s.classId || !s.enrollmentId || !previewReady || (unsupported.length > 0 && !acknowledged)}
	onSubmit={confirmTransfer}
>
	<div class="space-y-2 py-2">
		<Label class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
			{$t('student.newClass')}
		</Label>
		<Select.Root type="single" value={target} onValueChange={v => v && (target = v)}>
			<Select.Trigger>
				<Select.Value placeholder={$t('student.newClass')}>
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
		{#if previewError}<p role="alert" class="text-sm text-destructive">{previewError}</p>{/if}
		{#if previewReady && unsupported.length}
			<div class="space-y-2 rounded-collection border p-3">
				<p>{$t('participation.unsupported')}</p>
				{#each unsupported as subject (subject.subjectId)}<p class="text-sm">{subject.name}</p>{/each}
				<label class="flex gap-2"><input type="checkbox" bind:checked={acknowledged} />{$t('participation.acknowledge')}</label>
			</div>
		{/if}
		{#if targetClass && target !== s.classId}
			<p class="text-xs text-muted-foreground">
				{$t('student.transferPreview', { name: s.name, class: targetClass.name })}
			</p>
		{/if}
	</div>
</FormModal>

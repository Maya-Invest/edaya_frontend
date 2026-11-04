<script lang="ts">
	import type { Student, StudentEnrollmentHistoryItem } from '$lib/types/school';
	import { academicContext } from '$lib/academic/context.svelte';
	import FormModal from '$lib/components/ui/FormModal.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';
	import { t } from '$lib/i18n';
	import { hasPermission } from '$lib/permissions';
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
	let placement = $state<StudentEnrollmentHistoryItem>();
	let ready = $state(false);
	let loadError = $state('');
	let saveError = $state('');
	let attempt = $state(0);
	const requestId = crypto.randomUUID();
	const canTransfer = $derived(placement && hasPermission('ENROLLMENT_MANAGE', { studentId: s.id, classId: placement.classGroupId }));
	const classes = $derived(academicContext.classes.filter(c => c.academicYearId === academicContext.yearId
		&& (!placement || canTransfer) && hasPermission('ENROLLMENT_MANAGE', { studentId: s.id, classId: c.id })));

	const currentClass = $derived(academicContext.classes.find(c => c.id === placement?.classGroupId));
	const targetClass = $derived(classes.find(c => c.id === target));
	const targetClassLabel = $derived(
		targetClass ? `${targetClass.name} · ${targetClass.level}` : '',
	);

	const enrollmentsTab = getStudentEnrollmentsTabState();
	$effect(() => {
		const studentId = s.id;
		const yearId = academicContext.yearId;
		const retry = attempt;
		let cancelled = false;
		ready = false;
		loadError = '';
		if (!open || !yearId)
			return;
		if (!retry) {
			target = '';
			saveError = '';
		}
		void enrollmentsTab.readPlacement(studentId, yearId).then((row) => {
			if (cancelled)
				return;
			if (retry && row && !placement)
				saveError = get(t)('student.placementChanged');
			placement = row;
			if (row || !retry)
				target = row?.classGroupId ?? '';
			ready = true;
		}).catch((error) => {
			if (!cancelled)
				loadError = error.message || get(t)('dataState.errorDefault');
		});
		return () => {
			cancelled = true;
		};
	});
	$effect(() => {
		const destination = target;
		const studentId = s.id;
		const enrollmentId = placement?.id;
		previewReady = false;
		acknowledged = false;
		previewError = '';
		let cancelled = false;
		if (open && ready && canTransfer && enrollmentId && destination && destination !== placement?.classGroupId) {
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

	async function savePlacement() {
		if (!ready || busy || !targetClass || target === placement?.classGroupId)
			return;
		busy = true;
		try {
			const ok = placement
				? await enrollmentsTab.transferClass({
					enrollmentId: placement.id,
					studentId: s.id,
					nextClassGroupId: target,
					acknowledgedDroppedSubjectIds: acknowledged ? unsupported.map(row => row.subjectId) : [],
					successMessage: get(t)('student.transferSuccess', {
						name: s.name,
						class: targetClass?.name ?? get(t)('student.newClass'),
					}),
				})
				: await enrollmentsTab.assignClass(s.id, target, requestId);

			if (ok) {
				open = false;
			}
			else {
				saveError = get(t)('mutation.failed');
				if (!placement)
					attempt++;
			}
		}
		finally {
			busy = false;
		}
	}
</script>

<FormModal
	bind:open
	title={ready && !placement ? $t('student.assignClass') : $t('student.changeClassTitle', { name: s.name })}
	description={ready && placement
		? $t('student.currentClass', {
			name: currentClass?.name ?? '—',
			level: currentClass?.level ?? '',
		})
		: ''}
	submitLabel={$t('common.confirm')}
	{busy}
	dirty={ready && Boolean(target) && target !== placement?.classGroupId}
	submitDisabled={!ready || !targetClass || target === placement?.classGroupId || (!!placement && (!previewReady || (unsupported.length > 0 && !acknowledged)))}
	onSubmit={savePlacement}
>
	{#if loadError}<p role="alert">{loadError}</p><button type="button" onclick={() => attempt++}>{$t('dataState.retry')}</button>
	{:else if ready && placement && !canTransfer}<p role="alert">{$t('dataState.denied')}</p>
	{:else if !ready}<p role="status">{$t('dataState.loading')}</p>
	{:else}
		<div class="space-y-2 py-2">
			{#if saveError}<p role="alert">{saveError}</p>{/if}
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
					{#each classes as c (c.id)}
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
			{#if placement && targetClass && target !== placement.classGroupId}
				<p class="text-xs text-muted-foreground">
					{$t('student.transferPreview', { name: s.name, class: targetClass.name })}
				</p>
			{/if}
		</div>
	{/if}
</FormModal>

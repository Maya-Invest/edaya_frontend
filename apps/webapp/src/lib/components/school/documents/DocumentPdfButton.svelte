<script lang="ts">
	import type { DocumentTemplateKey } from '$lib/api/documents-types';
	import type { PermissionCode } from '$lib/auth/types';
	import { requestDocumentIssuanceMutation } from '$lib/api/mutations/documents.mutations';
	import Button from '$lib/components/ui/button/button.svelte';
	import PermissionGate from '$lib/components/ui/PermissionGate.svelte';
	import { downloadDocumentLabel } from '$lib/documents/titles';
	import { t } from '$lib/i18n';
	import { FileText } from '$lib/icons';

	const {
		templateKey,
		sourceId,
		studentId,
		classGroupId,
		academicPeriodId,
		classSubjectId,
		teacherId,
		permission,
		classId,
		label,
		disabled = false,
	}: {
		templateKey: DocumentTemplateKey;
		sourceId: string | null | undefined;
		studentId?: string;
		classGroupId?: string;
		academicPeriodId?: string;
		classSubjectId?: string;
		teacherId?: string;
		permission: PermissionCode;
		classId?: string;
		label?: string;
		disabled?: boolean;
	} = $props();

	const resolvedLabel = $derived(label ?? downloadDocumentLabel($t, templateKey));
	let busy = $state(false);

	async function generate() {
		if (!sourceId || busy) {
			return;
		}
		busy = true;
		try {
			await requestDocumentIssuanceMutation({
				templateKey,
				sourceId,
				studentId,
				classGroupId,
				academicPeriodId,
				classSubjectId,
				teacherId,
				successMessage: $t('documents.toastRequested'),
			});
		}
		finally {
			busy = false;
		}
	}
</script>

<PermissionGate {permission} {classId} mode="disable" tooltip={$t('documents.permissionIssue')}>
	{#snippet children({ disabled: gated, title })}
		<Button
			size="sm"
			variant="outline"
			class="rounded-full"
			disabled={disabled || gated || busy || !sourceId}
			{title}
			onclick={() => void generate()}
		>
			<FileText class="mr-1 h-4 w-4" />
			{resolvedLabel}
		</Button>
	{/snippet}
</PermissionGate>

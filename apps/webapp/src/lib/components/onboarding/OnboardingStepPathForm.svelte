<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
import Input from '$lib/components/ui/input/input.svelte';
import Label from '$lib/components/ui/label/label.svelte';
import { createConsortiumApi } from '$lib/api/consortium-data';
import { t } from '$lib/i18n';
import { Check } from '$lib/icons';
import { onboardingContext } from '$lib/onboarding/context.svelte';
import { toast } from '$lib/toast.svelte';
import { cn } from '$lib/utils';
import { ApiError } from '@maya-invest/edaya-api-client';
import { get } from 'svelte/store';

interface Props {
	disabled?: boolean;
}

const { disabled = false }: Props = $props();

let choice = $state<'single' | 'consortium' | null>(onboardingContext.draft.pathChoice);
let submitting = $state(false);

const groupNameValid = $derived(onboardingContext.draft.consortiumName.trim().length > 0);
const canConfirm = $derived(choice === 'single' || (choice === 'consortium' && groupNameValid));
const isBusy = $derived(disabled || submitting);

function selectSingle() {
	choice = 'single';
	onboardingContext.draft.pathChoice = 'single';
	onboardingContext.persist();
}

function selectConsortium() {
	choice = 'consortium';
	onboardingContext.draft.pathChoice = 'consortium';
	onboardingContext.persist();
}

function handleGroupNameInput() {
	onboardingContext.persist();
}

async function confirmChoice() {
	if (!choice || !canConfirm || submitting) {
		return;
	}

	submitting = true;
	try {
		if (choice === 'single') {
			onboardingContext.markPathChoice({ pathChoice: 'single' });
			return;
		}

		const name = onboardingContext.draft.consortiumName.trim();
		const country = onboardingContext.draft.school.country.trim() || 'CI';
		const consortium = await createConsortiumApi({
			name,
			country,
			sharedRules: { structureTemplateIds: [] },
		});
		onboardingContext.markPathChoice({
			pathChoice: 'consortium',
			consortiumId: consortium.id,
			consortiumName: consortium.name,
		});
	}
	catch (error) {
		if (error instanceof ApiError && error.body && typeof error.body === 'object') {
			const body = error.body as Record<string, unknown>;
			if (body.code === 'CONSORTIUM_ALREADY_EXISTS') {
				// Resume with existing group owned by this account
				try {
					const { fetchMyConsortium } = await import('$lib/api/consortium-data');
					const existing = await fetchMyConsortium();
					if (existing) {
						onboardingContext.markPathChoice({
							pathChoice: 'consortium',
							consortiumId: existing.id,
							consortiumName: existing.name,
						});
						return;
					}
				}
				catch {
					// fall through
				}
			}
			if (typeof body.message === 'string') {
				toast.error(body.message);
				return;
			}
		}
		toast.error(get(t)('onboarding.path.createFailed'));
	}
	finally {
		submitting = false;
	}
}
</script>

<div class="space-y-4">
	<div class="grid gap-2 sm:grid-cols-2">
		<button
			type="button"
			disabled={isBusy}
			onclick={selectSingle}
			aria-pressed={choice === 'single'}
			class={cn(
				'flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50',
				choice === 'single' && 'border-primary bg-primary/5',
			)}
		>
			<span
				class={cn(
					'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border text-primary-foreground',
					choice === 'single' && 'border-primary bg-primary',
				)}
			>
				{#if choice === 'single'}<Check class="h-3 w-3" />{/if}
			</span>
			<span>
				<span class="block font-display text-sm font-semibold text-foreground">
					{$t('onboarding.path.single')}
				</span>
				<span class="mt-0.5 block text-xs text-muted-foreground">
					{$t('onboarding.path.singleHint')}
				</span>
			</span>
		</button>

		<button
			type="button"
			disabled={isBusy}
			onclick={selectConsortium}
			aria-pressed={choice === 'consortium'}
			class={cn(
				'flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50',
				choice === 'consortium' && 'border-primary bg-primary/5',
			)}
		>
			<span
				class={cn(
					'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border text-primary-foreground',
					choice === 'consortium' && 'border-primary bg-primary',
				)}
			>
				{#if choice === 'consortium'}<Check class="h-3 w-3" />{/if}
			</span>
			<span>
				<span class="block font-display text-sm font-semibold text-foreground">
					{$t('onboarding.path.group')}
				</span>
				<span class="mt-0.5 block text-xs text-muted-foreground">
					{$t('onboarding.path.groupHint')}
				</span>
			</span>
		</button>
	</div>

	{#if choice === 'consortium'}
		<div class="space-y-1">
			<Label for="onboarding-consortium-name">{$t('onboarding.path.groupName')}</Label>
			<Input
				id="onboarding-consortium-name"
				bind:value={onboardingContext.draft.consortiumName}
				placeholder={$t('onboarding.path.groupNamePlaceholder')}
				disabled={isBusy}
				oninput={handleGroupNameInput}
			/>
		</div>
	{/if}

	<Button type="button" class="w-full sm:w-auto" disabled={isBusy || !canConfirm} onclick={confirmChoice}>
		{$t('onboarding.continue')}
	</Button>
</div>

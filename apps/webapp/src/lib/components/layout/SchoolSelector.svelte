<script lang="ts">
	import { authSession } from '$lib/auth/session.svelte';
	import { switchActiveSchool } from '$lib/auth/switch-school';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { t } from '$lib/i18n';
	import { Check, MoreHorizontal } from '$lib/icons';
	import { cn } from '$lib/utils';

	const { collapsed = false }: { collapsed?: boolean } = $props();

	let open = $state(false);
	const memberships = $derived(authSession.staffMemberships);
	const canSwitch = $derived(memberships.length > 1);
	const currentName = $derived(
		authSession.school?.shortName
		?? authSession.activeStaffMembership?.schoolShortName
		?? $t('sidebar.module'),
	);

	async function selectSchool(schoolId: string) {
		open = false;
		await switchActiveSchool(schoolId);
	}
</script>

{#snippet schoolOptions(label: 'short' | 'full')}
	{#each memberships as membership (membership.actorId)}
		{@const selected = membership.schoolId === authSession.schoolId}
		<button
			type="button"
			data-testid="school-selector-option"
			data-school-id={membership.schoolId}
			aria-current={selected ? 'true' : undefined}
			class={cn(
				'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary',
				selected && 'bg-primary/5',
			)}
			onclick={() => void selectSchool(membership.schoolId)}
		>
			<span class="min-w-0 truncate">
				{label === 'short' ? membership.schoolShortName : membership.schoolName}
			</span>
			{#if selected}
				<Check class="h-3.5 w-3.5 shrink-0 text-accent" />
			{/if}
		</button>
	{/each}
{/snippet}

{#if collapsed}
	{#if canSwitch}
		<Popover.Popover bind:open>
			<Popover.PopoverTrigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						size="sm"
						class="h-8 w-8 rounded-full p-0"
						aria-label={$t('sidebar.switchSchool')}
						data-testid="school-selector"
					>
						<MoreHorizontal class="h-4 w-4" />
					</Button>
				{/snippet}
			</Popover.PopoverTrigger>
			<Popover.PopoverContent class="w-56 p-1" align="start" side="right">
				{@render schoolOptions('short')}
			</Popover.PopoverContent>
		</Popover.Popover>
	{/if}
{:else}
	<div class="flex w-full min-w-0 items-center gap-1 pb-1 pt-1" data-testid="school-selector">
		<p class="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground" title={currentName}>
			{currentName}
		</p>
		{#if canSwitch}
			<Popover.Popover bind:open>
				<Popover.PopoverTrigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							size="sm"
							class="h-7 w-7 shrink-0 rounded-full p-0"
							aria-label={$t('sidebar.switchSchool')}
							data-testid="school-selector-menu"
						>
							<MoreHorizontal class="h-4 w-4" />
						</Button>
					{/snippet}
				</Popover.PopoverTrigger>
				<Popover.PopoverContent class="w-56 p-1" align="start">
					{@render schoolOptions('full')}
				</Popover.PopoverContent>
			</Popover.Popover>
		{/if}
	</div>
{/if}

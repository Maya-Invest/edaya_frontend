<script lang="ts">
  import GradeLevelFormModal from '../../../src/routes/(app)/configuration/structure/levels/components/GradeLevelFormModal.svelte';
  import { provideDirtyWork } from '../../../src/lib/interaction/dirty-work.svelte';
  import { evidence, level } from './action-state.svelte';
  const dirtyWork = provideDirtyWork();
  let { open = $bindable(false), create = false, confirm = false, onConfirmStep }: {
    open?: boolean;
    create?: boolean;
    confirm?: boolean;
    onConfirmStep: (value: boolean) => void;
  } = $props();
</script>
<output data-testid="level-dirty">{String(dirtyWork.hasDirtyWork())}</output>
<GradeLevelFormModal bind:open gradeLevel={create ? undefined : evidence.savedLevel ?? level} {confirm} {onConfirmStep} />

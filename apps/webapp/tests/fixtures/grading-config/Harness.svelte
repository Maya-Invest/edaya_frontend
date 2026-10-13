<script lang="ts">
 import GradeScaleFormModal from '../../../src/routes/(app)/configuration/other/grade-scales/components/GradeScaleFormModal.svelte';
 import GradingConfigurationModal from '../../../src/routes/(app)/configuration/grade-levels/components/GradingConfigurationModal.svelte';
 import { setLang } from '../../../src/lib/i18n';
 import { evidence, level, scale } from './action-state.svelte';
 let scaleOpen = $state(true);
 let gradingOpen = $state(false);
 let confirm = $state(false);
</script>
<button data-testid="scale" onclick={() => scaleOpen = true}>Scale</button>
<button data-testid="policy" onclick={() => gradingOpen = true}>Policy</button>
<button data-testid="fr" onclick={() => setLang('fr')}>French</button>
<button data-testid="en" onclick={() => setLang('en')}>English</button>
<pre data-testid="requests">{JSON.stringify(evidence.requests)}</pre>
<GradeScaleFormModal bind:open={scaleOpen} {scale} />
<GradingConfigurationModal bind:open={gradingOpen} gradeLevel={level} {confirm} onConfirmStep={value => confirm = value} />

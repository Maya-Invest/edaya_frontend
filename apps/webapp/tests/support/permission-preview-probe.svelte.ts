import { PermissionImpactPreviewState } from '../../src/lib/school/permission-impact-preview-state.svelte';

/** The same derived Save gate used by the permission forms. */
export class PermissionPreviewProbe {
	readonly preview = new PermissionImpactPreviewState();
	readonly input = { staffId: 'staff', academicYearId: 'year' };
	readonly reviewed = $derived(this.preview.reviewed(this.input));
}

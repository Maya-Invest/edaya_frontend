import { describe, expect, it } from 'bun:test';
import {
	estimateProvisionPercent,
	getProvisionProgressSteps,
	mapServerPhaseToStepId,
	PROVISION_WAIT_ASYMPTOTE,
} from '$lib/onboarding/provision-progress';

describe('provision progress', () => {
	it('omits staff step when includeStaff is false', () => {
		const steps = getProvisionProgressSteps({ includeStaff: false });
		expect(steps.map(step => step.id)).toEqual([
			'school',
			'academic',
			'structure',
			'complete',
			'bootstrap',
		]);
	});

	it('estimates wait progress without reaching 100%', () => {
		const early = estimateProvisionPercent(500, false);
		const later = estimateProvisionPercent(20_000, false);
		expect(early.percent).toBeGreaterThan(0);
		expect(early.percent).toBeLessThan(later.percent);
		expect(later.percent).toBeLessThan(PROVISION_WAIT_ASYMPTOTE);
		expect(later.activeStepId).toBeTruthy();
	});

	it('maps server phases to step ids', () => {
		expect(mapServerPhaseToStepId('registerSchool')).toBe('school');
		expect(mapServerPhaseToStepId('ensureAcademicStructure')).toBe('academic');
		expect(mapServerPhaseToStepId('applyStructureTemplate')).toBe('structure');
		expect(mapServerPhaseToStepId('structure.curriculum')).toBe('structure');
		expect(mapServerPhaseToStepId('structure.classMirrors')).toBe('structure');
		expect(mapServerPhaseToStepId('structure.reportCards')).toBe('structure');
		expect(mapServerPhaseToStepId('completeWizard')).toBe('complete');
		expect(mapServerPhaseToStepId('unknown')).toBeNull();
	});
});

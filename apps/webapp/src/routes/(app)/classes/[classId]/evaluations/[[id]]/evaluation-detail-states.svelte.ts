import {
	EvaluationGradingTabState,
	setEvaluationGradingTabState,
} from './(tabs)/grading/evaluation-grading-tab.svelte';

export interface EvaluationDetailTabStates {
	grading: EvaluationGradingTabState;
}

export function createAndRegisterEvaluationDetailStates(): EvaluationDetailTabStates {
	const states: EvaluationDetailTabStates = {
		grading: new EvaluationGradingTabState(),
	};

	setEvaluationGradingTabState(states.grading);

	return states;
}

export function clearEvaluationDetailTabStates(states: EvaluationDetailTabStates) {
	states.grading.clear();
}

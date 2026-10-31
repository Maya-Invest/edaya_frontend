import type { DatasetCatalog, DatasetChoice, DatasetReference, OnboardingDataset } from '$lib/onboarding/dataset-model';
import { buildDatasetCatalog } from '$lib/onboarding/dataset-model';

export interface DatasetLoadState {
	status: 'loading' | 'ready' | 'empty' | 'error';
	catalog: DatasetCatalog | null;
	choices: DatasetChoice[];
	allChoices: DatasetChoice[];
	unavailableVersion: boolean;
}
export interface DatasetReadPort {
	list: (country: string | undefined, signal: AbortSignal) => Promise<DatasetChoice[]>;
	get: (reference: DatasetReference, signal: AbortSignal) => Promise<OnboardingDataset>;
}
/** Each wizard instance owns its requests; prior selections can never publish late data. */
export class DatasetLoader {
	private generation = 0;
	private controller: AbortController | null = null;
	constructor(private readonly port: DatasetReadPort, private readonly publish: (state: DatasetLoadState) => void) {}
	dispose() {
		this.generation++;
		this.controller?.abort();
	}

	async load(country: string, reference: DatasetReference | null): Promise<void> {
		this.dispose();
		const generation = this.generation;
		const controller = new AbortController();
		this.controller = controller;
		const state: DatasetLoadState = { status: 'loading', catalog: null, choices: [], allChoices: [], unavailableVersion: false };
		this.publish(state);
		try {
			const [allChoices, choices] = await Promise.all([this.port.list(undefined, controller.signal), this.port.list(country, controller.signal)]);
			if (generation !== this.generation)
				return;
			state.allChoices = allChoices;
			state.choices = choices;
			if (!choices.length) {
				this.publish({ ...state, status: 'empty' });
				return;
			}
			const selected = reference ?? choices.find(row => row.isDefault) ?? choices[0]!;
			if (!choices.some(row => row.id === selected.id))
				throw new Error('Dataset does not belong to this country');
			const dataset = await this.port.get(selected, controller.signal);
			if (generation !== this.generation)
				return;
			if (dataset.id !== selected.id || dataset.version !== selected.version || !choices.some(row => row.countryCode === dataset.countryCode))
				throw new Error('Dataset response does not match selection');
			this.publish({ ...state, status: 'ready', catalog: buildDatasetCatalog(dataset) });
		}
		catch {
			if (generation === this.generation)
				this.publish({ ...state, status: 'error', unavailableVersion: reference !== null });
		}
	}
}

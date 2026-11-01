import type { components } from '$lib/api/schema';
import type { DatasetReadPort } from './dataset-loader';
import { PUBLIC_API_URL } from '$env/static/public';
import { parseApiResponse, resolveApiUrl } from '$lib/api/http';
import { bearerFetch } from '$lib/auth/bearer-fetch';
import { resolveClientRoutePath } from '@maya-invest/edaya-api-client';

async function read<T>(path: string, signal: AbortSignal): Promise<T> {
	return parseApiResponse<T>(path, await bearerFetch(resolveApiUrl(PUBLIC_API_URL, path), { method: 'GET', headers: { Accept: 'application/json' }, signal }));
}
export const datasetReadPort: DatasetReadPort = {
	async list(country, signal) {
		const path = resolveClientRoutePath('onboarding/datasets') + (country === undefined ? '' : `?country=${encodeURIComponent(country)}`);
		return (await read<components['schemas']['OnboardingDatasetChoices']>(path, signal)).datasets;
	},
	get(reference, signal) {
		const path = resolveClientRoutePath('onboarding/datasets/{id}/{version}', { id: encodeURIComponent(reference.id), version: encodeURIComponent(reference.version) });
		return read<components['schemas']['OnboardingDataset']>(path, signal);
	},
};

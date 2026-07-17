import type { components } from '$lib/api/schema';
import { createSchoolClient } from '@maya-invest/edaya-api-client';
import { createBrowserTransport } from './browser-transport';

type BrowserSchoolClient = ReturnType<typeof createSchoolClient<components['schemas']>>;

let browserSchoolClient: BrowserSchoolClient | undefined;
let getYearId: () => string | undefined = () => undefined;

export function configureBrowserSchoolClient(options: { getYearId: () => string | undefined }) {
	getYearId = options.getYearId;
	browserSchoolClient = undefined;
}

export function getBrowserSchoolClient(): BrowserSchoolClient {
	browserSchoolClient ??= createSchoolClient<components['schemas']>(createBrowserTransport(getYearId));
	return browserSchoolClient;
}

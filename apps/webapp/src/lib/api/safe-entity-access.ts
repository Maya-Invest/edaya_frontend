import { ApiError } from '@edaya/api-client';

/** Optional enrichment reads (e.g. teacher names) that must not break page loads on 403. */
export async function safeOptionalEntityList<T>(
	load: () => Promise<T[] | null | undefined>,
): Promise<T[]> {
	try {
		return (await load()) ?? [];
	}
	catch (error) {
		if (error instanceof ApiError && (error.status === 403 || error.status === 401)) {
			return [];
		}
		throw error;
	}
}

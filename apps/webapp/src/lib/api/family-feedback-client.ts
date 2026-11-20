import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { Transport } from '@maya-invest/edaya-api-client';
import { academicContext } from '$lib/academic/context.svelte';
import { createBrowserTransport } from '$lib/api/browser-transport';
import { resolveClientRoutePath } from '@maya-invest/edaya-api-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

function clientTransport(client: SchoolClient): Transport {
	const entities = client.entities as unknown as Record<string, { transport?: Transport }>;
	const resource = entities.payments ?? Object.values(entities)[0];
	if (resource?.transport) {
		return resource.transport;
	}
	return createBrowserTransport(() => academicContext.yearId || undefined);
}

function commandFn(client: SchoolClient, method: string): ((payload: unknown) => Promise<unknown>) | undefined {
	const commands = client.commands as Record<string, ((payload: unknown) => Promise<unknown>) | undefined>;
	const fn = commands[method];
	return typeof fn === 'function' ? fn : undefined;
}

function queryFn(client: SchoolClient, method: string): ((payload: unknown) => Promise<unknown>) | undefined {
	const queries = client.queries as Record<string, ((payload: unknown) => Promise<unknown>) | undefined>;
	const fn = queries[method];
	return typeof fn === 'function' ? fn : undefined;
}

export async function familyFeedbackCommand<T>(
	client: SchoolClient,
	method: string,
	publicName: string,
	payload: unknown,
): Promise<T> {
	const bound = commandFn(client, method);
	if (bound) {
		return bound(payload) as Promise<T>;
	}
	return clientTransport(client).request<T>(
		'POST',
		resolveClientRoutePath(`commands/${publicName}`),
		{ body: payload },
	);
}

export async function familyFeedbackQuery<T>(
	client: SchoolClient,
	method: string,
	publicName: string,
	payload: unknown,
): Promise<T> {
	const bound = queryFn(client, method);
	if (bound) {
		return bound(payload) as Promise<T>;
	}
	return clientTransport(client).request<T>(
		'POST',
		resolveClientRoutePath(`queries/${publicName}`),
		{ body: payload },
	);
}

export function familyFeedbackRequestId(): string {
	return crypto.randomUUID();
}

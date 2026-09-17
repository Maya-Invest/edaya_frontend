import type { getBrowserSchoolClient } from '$lib/api/school-client';
import type { EntityQuery, Transport } from '@maya-invest/edaya-api-client';
import { academicContext } from '$lib/academic/context.svelte';
import { createBrowserTransport } from '$lib/api/browser-transport';
import { EntityResource, resolveClientRoutePath } from '@maya-invest/edaya-api-client';

type SchoolClient = ReturnType<typeof getBrowserSchoolClient>;

const COMMAND_ONLY = {
	create: false,
	update: false,
	delete: false,
	batchCreate: false,
	batchUpdate: false,
	batchDelete: false,
} as const;

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

function entityResource<T>(client: SchoolClient, entityKey: string, publicName: string): EntityResource<T> {
	const entities = client.entities as unknown as Record<string, EntityResource<T> | undefined>;
	const existing = entities[entityKey];
	if (existing?.list) {
		return existing;
	}
	return new EntityResource<T>(clientTransport(client), publicName, COMMAND_ONLY);
}

export async function financeCommand<T>(
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

export async function financeQuery<T>(
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

export function financeEntities<T>(
	client: SchoolClient,
	entityKey: string,
	publicName: string,
): EntityResource<T> {
	return entityResource<T>(client, entityKey, publicName);
}

export function catalogServicesEntity(client: SchoolClient) {
	return financeEntities(client, 'catalogServices', 'catalog-services');
}

export function studentChargesEntity(client: SchoolClient) {
	return financeEntities(client, 'studentCharges', 'student-charges');
}

export function studentYearAccountsEntity(client: SchoolClient) {
	return financeEntities(client, 'studentYearAccounts', 'student-year-accounts');
}

export function studentServiceEnrollmentsEntity(client: SchoolClient) {
	return financeEntities(client, 'studentServiceEnrollments', 'student-service-enrollments');
}

export function paymentsEntity(client: SchoolClient) {
	return financeEntities(client, 'payments', 'payments');
}

export function listFinanceEntities<T>(
	client: SchoolClient,
	entityKey: string,
	publicName: string,
	query: EntityQuery = {},
): Promise<T[]> {
	return financeEntities<T>(client, entityKey, publicName).list(query);
}

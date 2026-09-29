// @edaya/client-codegen runtime
import type { Transport } from './transport'
import { unwrapEntity, unwrapEntityList } from './entity-envelope'
import { schoolApiPath } from './paths'

export type EntityQuery = Record<string, unknown> & {
	$orderBy?: Array<{ field: string, direction: 'asc' | 'desc' }>
	$limit?: number
	$offset?: number
}

export interface PublicEntityOperations {
	readonly create: boolean
	readonly update: boolean
	readonly delete: boolean
	readonly batchCreate: boolean
	readonly batchUpdate: boolean
	readonly batchDelete: boolean
}

export interface BaseEntityResource<TEntity> {
	list: (query?: EntityQuery) => Promise<TEntity[]>
	one: (query: EntityQuery) => Promise<TEntity>
	count: (query?: EntityQuery) => Promise<{ count: number }>
	get: (id: string) => Promise<TEntity>
}

export interface DirectSaveEntityResource<TEntity> extends BaseEntityResource<TEntity> {
	delete: (input: { id: string }) => Promise<{ message: string }>
	batchDelete: (input: { ids: string[] }) => Promise<{ message: string }>
	save: (entity: TEntity) => Promise<TEntity>
	batchSave: (input: { entities: TEntity[] }) => Promise<{ ids: string[] }>
}

export type PublicEntityResource<TEntity, TOperations extends PublicEntityOperations>
	= BaseEntityResource<TEntity>
		& (TOperations extends { create: true, update: true } ? Pick<DirectSaveEntityResource<TEntity>, 'save'> : unknown)
		& (TOperations extends { batchCreate: true, batchUpdate: true } ? Pick<DirectSaveEntityResource<TEntity>, 'batchSave'> : unknown)
		& (TOperations extends { delete: true } ? Pick<DirectSaveEntityResource<TEntity>, 'delete'> : unknown)
		& (TOperations extends { batchDelete: true } ? Pick<DirectSaveEntityResource<TEntity>, 'batchDelete'> : unknown)

export class EntityResource<TEntity> implements DirectSaveEntityResource<TEntity> {
	constructor(
		private readonly transport: Transport,
		private readonly publicName: string,
		private readonly operations: PublicEntityOperations,
	) {}

	async list(query: EntityQuery = {}): Promise<TEntity[]> {
		const result = await this.transport.request<unknown>('POST', this.path('list'), { body: query })
		return unwrapEntityList<TEntity>(result)
	}

	async one(query: EntityQuery): Promise<TEntity> {
		const result = await this.transport.request<unknown>('POST', this.path('one'), { body: query })
		return unwrapEntity<TEntity>(result)
	}

	count(query: EntityQuery = {}): Promise<{ count: number }> {
		return this.transport.request('POST', this.path('count'), { body: query })
	}

	async get(id: string): Promise<TEntity> {
		const result = await this.transport.request<unknown>('GET', schoolApiPath('entities', this.publicName, id))
		return unwrapEntity<TEntity>(result)
	}

	async save(entity: TEntity): Promise<TEntity> {
		this.requireOperation(this.operations.create && this.operations.update)
		const result = await this.transport.request<unknown>('POST', this.path('save'), { body: entity })
		return unwrapEntity<TEntity>(result)
	}

	delete(input: { id: string }): Promise<{ message: string }> {
		this.requireOperation(this.operations.delete)
		return this.transport.request('POST', this.path('delete'), { body: input })
	}

	batchSave(input: { entities: TEntity[] }): Promise<{ ids: string[] }> {
		this.requireOperation(this.operations.batchCreate && this.operations.batchUpdate)
		return this.transport.request('POST', this.path('batch-save'), { body: input })
	}

	batchDelete(input: { ids: string[] }): Promise<{ message: string }> {
		this.requireOperation(this.operations.batchDelete)
		return this.transport.request('POST', this.path('batch-delete'), { body: input })
	}

	private requireOperation(allowed: boolean): void {
		if (!allowed)
			throw new Error(`Generic mutation is unavailable for ${this.publicName}; use a domain command`)
	}

	private path(action: string): string {
		return schoolApiPath('entities', this.publicName, action)
	}
}

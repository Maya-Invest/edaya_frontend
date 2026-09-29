import type { Transport } from './transport';
export type EntityQuery = Record<string, unknown> & {
    $orderBy?: Array<{
        field: string;
        direction: 'asc' | 'desc';
    }>;
    $limit?: number;
    $offset?: number;
};
export interface PublicEntityOperations {
    readonly create: boolean;
    readonly update: boolean;
    readonly delete: boolean;
    readonly batchCreate: boolean;
    readonly batchUpdate: boolean;
    readonly batchDelete: boolean;
}
export interface BaseEntityResource<TEntity> {
    list: (query?: EntityQuery) => Promise<TEntity[]>;
    one: (query: EntityQuery) => Promise<TEntity>;
    count: (query?: EntityQuery) => Promise<{
        count: number;
    }>;
    get: (id: string) => Promise<TEntity>;
}
export interface DirectSaveEntityResource<TEntity> extends BaseEntityResource<TEntity> {
    delete: (input: {
        id: string;
    }) => Promise<{
        message: string;
    }>;
    batchDelete: (input: {
        ids: string[];
    }) => Promise<{
        message: string;
    }>;
    save: (entity: TEntity) => Promise<TEntity>;
    batchSave: (input: {
        entities: TEntity[];
    }) => Promise<{
        ids: string[];
    }>;
}
export type PublicEntityResource<TEntity, TOperations extends PublicEntityOperations> = BaseEntityResource<TEntity> & (TOperations extends {
    create: true;
    update: true;
} ? Pick<DirectSaveEntityResource<TEntity>, 'save'> : unknown) & (TOperations extends {
    batchCreate: true;
    batchUpdate: true;
} ? Pick<DirectSaveEntityResource<TEntity>, 'batchSave'> : unknown) & (TOperations extends {
    delete: true;
} ? Pick<DirectSaveEntityResource<TEntity>, 'delete'> : unknown) & (TOperations extends {
    batchDelete: true;
} ? Pick<DirectSaveEntityResource<TEntity>, 'batchDelete'> : unknown);
export declare class EntityResource<TEntity> implements DirectSaveEntityResource<TEntity> {
    private readonly transport;
    private readonly publicName;
    private readonly operations;
    constructor(transport: Transport, publicName: string, operations: PublicEntityOperations);
    list(query?: EntityQuery): Promise<TEntity[]>;
    one(query: EntityQuery): Promise<TEntity>;
    count(query?: EntityQuery): Promise<{
        count: number;
    }>;
    get(id: string): Promise<TEntity>;
    save(entity: TEntity): Promise<TEntity>;
    delete(input: {
        id: string;
    }): Promise<{
        message: string;
    }>;
    batchSave(input: {
        entities: TEntity[];
    }): Promise<{
        ids: string[];
    }>;
    batchDelete(input: {
        ids: string[];
    }): Promise<{
        message: string;
    }>;
    private requireOperation;
    private path;
}
//# sourceMappingURL=entity-resource.d.ts.map
export interface PublicEntityOperations {
    readonly create: boolean;
    readonly update: boolean;
    readonly delete: boolean;
    readonly batchCreate: boolean;
    readonly batchUpdate: boolean;
    readonly batchDelete: boolean;
}
export interface ClientEntityBinding {
    publicName: string;
    schemaName: string;
    allowDirectSave: boolean;
    publicOperations: PublicEntityOperations;
}
export interface ClientCommandBinding {
    publicName: string;
    requestSchemaName: string;
    responseSchemaName: string;
}
export interface ClientQueryBinding {
    publicName: string;
    requestSchemaName: string;
    responseSchemaName: string;
}
export interface ClientNamespaceRouteBinding {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    pathParams?: string[];
    requestSchemaName?: string;
    responseSchemaName?: string;
    basePath?: 'core' | 'root';
    responseIsArray?: boolean;
}
export type ClientNamespaceBindings = Record<string, ClientNamespaceRouteBinding>;
export declare const CORE_BINDING_KEYS: readonly ["entities", "commands", "queries"];
export type CoreBindingKey = typeof CORE_BINDING_KEYS[number];
export interface ClientBindingsDocument {
    entities: Record<string, ClientEntityBinding>;
    commands: Record<string, ClientCommandBinding>;
    queries: Record<string, ClientQueryBinding>;
    [namespaceKey: string]: Record<string, ClientEntityBinding> | Record<string, ClientCommandBinding> | Record<string, ClientQueryBinding> | Record<string, ClientNamespaceRouteBinding>;
}
export declare function createEmptyClientBindingsDocument(): ClientBindingsDocument;
export declare function getNamespaceKeys(bindings: ClientBindingsDocument): string[];
export declare function getNamespaceBindings(bindings: ClientBindingsDocument, namespace: string): ClientNamespaceBindings;
//# sourceMappingURL=bindings.d.ts.map
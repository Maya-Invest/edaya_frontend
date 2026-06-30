import type { BaseEntityResource, DirectSaveEntityResource } from './entity-resource.ts'
import type { Transport } from './transport.ts'
import { EntityResource } from './entity-resource.ts'
import { clientBindings } from './generated/client-bindings.ts'
import { schoolApiPath } from './paths.ts'

type SchemaName<TSchemas extends Record<string, unknown>, TName extends string>
  = TName extends keyof TSchemas ? TSchemas[TName] : never

type EntityClient<
  TSchemas extends Record<string, unknown>,
  TBinding extends { schemaName: string, allowDirectSave: boolean },
> = TBinding['allowDirectSave'] extends true
  ? DirectSaveEntityResource<SchemaName<TSchemas, TBinding['schemaName']>>
  : BaseEntityResource<SchemaName<TSchemas, TBinding['schemaName']>>

type EntityClients<TSchemas extends Record<string, unknown>> = {
  [K in keyof typeof clientBindings.entities]: EntityClient<
    TSchemas,
    typeof clientBindings.entities[K]
  >
}

type CommandClients<TSchemas extends Record<string, unknown>> = {
  [K in keyof typeof clientBindings.commands]: (
    payload: SchemaName<TSchemas, typeof clientBindings.commands[K]['requestSchemaName']>,
  ) => Promise<SchemaName<TSchemas, typeof clientBindings.commands[K]['responseSchemaName']>>
}

type QueryClients<TSchemas extends Record<string, unknown>> = {
  [K in keyof typeof clientBindings.queries]: (
    payload: SchemaName<TSchemas, typeof clientBindings.queries[K]['requestSchemaName']>,
  ) => Promise<SchemaName<TSchemas, typeof clientBindings.queries[K]['responseSchemaName']>>
}

export interface SchoolClient<TSchemas extends Record<string, unknown>> {
  entities: EntityClients<TSchemas>
  commands: CommandClients<TSchemas>
  queries: QueryClients<TSchemas>
  authorization: {
    effectiveGrants: () => Promise<SchemaName<TSchemas, 'EffectiveGrantsResponse'>>
  }
}

export function createSchoolClient<TSchemas extends Record<string, unknown>>(
  transport: Transport,
): SchoolClient<TSchemas> {
  const entities = Object.fromEntries(
    Object.entries(clientBindings.entities).map(([key, binding]) => [
      key,
      new EntityResource(transport, binding.publicName),
    ]),
  ) as unknown as EntityClients<TSchemas>

  const commands = Object.fromEntries(
    Object.entries(clientBindings.commands).map(([key, binding]) => [
      key,
      (payload: unknown) =>
        transport.request('POST', schoolApiPath('commands', binding.publicName), { body: payload }),
    ]),
  ) as CommandClients<TSchemas>

  const queries = Object.fromEntries(
    Object.entries(clientBindings.queries).map(([key, binding]) => [
      key,
      (payload: unknown) =>
        transport.request('POST', schoolApiPath('queries', binding.publicName), { body: payload }),
    ]),
  ) as QueryClients<TSchemas>

  return {
    entities,
    commands,
    queries,
    authorization: {
      effectiveGrants: () => transport.request('GET', schoolApiPath('authorization', 'effective-grants')),
    },
  }
}

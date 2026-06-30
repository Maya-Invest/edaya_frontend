export { createSchoolClient, type SchoolClient } from './create-client.ts'
export { unwrapEntity, unwrapEntityList } from './entity-envelope.ts'
export {
  type BaseEntityResource,
  type DirectSaveEntityResource,
  type EntityQuery,
  EntityResource,
} from './entity-resource.ts'
export { ApiError } from './errors.ts'
export { clientBindings, type ClientBindings } from './generated/client-bindings.ts'
export { type Transport, type TransportRequestOptions } from './transport.ts'

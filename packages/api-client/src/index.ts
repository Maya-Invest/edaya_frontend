export { unwrapEntity, unwrapEntityList } from './entity-envelope'
export {
  type BaseEntityResource,
  type DirectSaveEntityResource,
  type EntityQuery,
  EntityResource,
} from './entity-resource'
export { ApiError } from './errors'
export { clientBindings, type ClientBindings } from './generated/client-bindings'
export { createSchoolClient, type SchoolClient } from './generated/create-client'
export { type Transport, type TransportRequestOptions } from './transport'

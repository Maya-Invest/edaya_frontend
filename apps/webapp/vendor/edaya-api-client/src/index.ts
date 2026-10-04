export { createSchoolClient, type SchoolClient } from './generated/create-client'
export { clientBindings, type ClientBindings } from './generated/client-bindings'
export { ApiError } from './runtime/errors'
export { unwrapEntity, unwrapEntityList } from './runtime/entity-envelope'
export {
	type BaseEntityResource,
	type DirectSaveEntityResource,
	type EntityQuery,
	EntityResource,
} from './runtime/entity-resource'
export { resolveClientRoutePath, schoolApiPath, SCHOOL_API_BASE_PATH } from './runtime/paths'
export { type Transport, type TransportRequestOptions } from './runtime/transport'
import { createSchoolClient } from './generated/create-client'
import type { Transport } from './runtime/transport'
import type { components } from './schema'
/** Account session transport, independent of school JWT exchange. */
export function createAuthClient(transport: Transport) {
  return createSchoolClient<components['schemas']>(transport).auth
}
export type AuthClient = ReturnType<typeof createAuthClient>

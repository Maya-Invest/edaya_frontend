export { createSchoolClient } from './generated/create-client';
export { clientBindings } from './generated/client-bindings';
export { ApiError } from './runtime/errors';
export { unwrapEntity, unwrapEntityList } from './runtime/entity-envelope';
export { EntityResource, } from './runtime/entity-resource';
export { resolveClientRoutePath, schoolApiPath, SCHOOL_API_BASE_PATH } from './runtime/paths';
import { createSchoolClient } from './generated/create-client';
/** Account session transport, independent of school JWT exchange. */
export function createAuthClient(transport) {
    return createSchoolClient(transport).auth;
}

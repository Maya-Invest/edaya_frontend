// @edaya/client-codegen runtime
function isEntityEnvelope(value) {
    if (typeof value !== 'object' || value === null || !('data' in value)) {
        return false;
    }
    const { data } = value;
    return typeof data === 'object' && data !== null;
}
export function unwrapEntity(value) {
    if (Array.isArray(value)) {
        return value.map(entry => unwrapEntity(entry));
    }
    if (!isEntityEnvelope(value)) {
        return value;
    }
    const { data, ...rest } = value;
    const merged = {};
    for (const [key, entry] of Object.entries(data)) {
        merged[key] = unwrapEntity(entry);
    }
    for (const [key, entry] of Object.entries(rest)) {
        merged[key] = unwrapEntity(entry);
    }
    return merged;
}
export function unwrapEntityList(values) {
    if (!Array.isArray(values)) {
        return [];
    }
    return values.map(entry => unwrapEntity(entry));
}

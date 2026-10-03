export const CORE_BINDING_KEYS = ['entities', 'commands', 'queries'];
export function createEmptyClientBindingsDocument() {
    return {
        entities: {},
        commands: {},
        queries: {},
    };
}
export function getNamespaceKeys(bindings) {
    return Object.keys(bindings)
        .filter(key => !CORE_BINDING_KEYS.includes(key))
        .sort();
}
export function getNamespaceBindings(bindings, namespace) {
    const value = bindings[namespace];
    if (!value || typeof value !== 'object') {
        return {};
    }
    return value;
}

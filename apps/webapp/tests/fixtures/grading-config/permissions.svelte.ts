export const access = $state({ allowed: true });
export const hasPermission = () => access.allowed;
export const hasAnyPermission = () => access.allowed;

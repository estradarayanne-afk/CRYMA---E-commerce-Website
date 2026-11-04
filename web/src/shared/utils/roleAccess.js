export function hasRoleAccess(user, allowedRoles) {
    return Boolean(user && Array.isArray(allowedRoles) && allowedRoles.includes(user.role));
}

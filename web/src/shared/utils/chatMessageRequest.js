export function getChatMessageRequestId(pending, message, scope, createId = () => crypto.randomUUID()) {
    return pending?.message === message && pending.scope === scope ? pending.id : createId();
}

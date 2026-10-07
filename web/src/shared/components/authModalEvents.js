const OPEN_EVENT = "cryma-open-auth";
const CLOSE_EVENT = "cryma-close-auth";

export function openAuthModal(mode = "login", options = {}) {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { mode, ...options } }));
}

export function closeAuthModal() {
    window.dispatchEvent(new Event(CLOSE_EVENT));
}

export { OPEN_EVENT, CLOSE_EVENT };

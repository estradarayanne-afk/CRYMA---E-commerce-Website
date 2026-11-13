let activeRequests = 0;
const listeners = new Set();

export function getActiveApiRequestCount() {
    return activeRequests;
}

export function subscribeToApiActivity(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function beginApiRequest() {
    activeRequests += 1;
    listeners.forEach((listener) => listener());

    let completed = false;
    return () => {
        if (completed) return;
        completed = true;
        activeRequests = Math.max(0, activeRequests - 1);
        listeners.forEach((listener) => listener());
    };
}

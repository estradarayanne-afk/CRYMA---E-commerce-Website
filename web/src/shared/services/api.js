import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const loopbackHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const configuredApiIsLoopback = configuredApiUrl
    ? loopbackHosts.has(new URL(configuredApiUrl, window.location.origin).hostname)
    : false;
const apiBaseUrl = import.meta.env.DEV
    ? (() => {
          if (!configuredApiUrl) return "/api";
          return configuredApiIsLoopback ? "/api" : configuredApiUrl;
      })()
    : configuredApiUrl && !configuredApiIsLoopback
      ? configuredApiUrl
      : "/api";

const api = axios.create({
    baseURL: apiBaseUrl,
    headers: {
        Accept: "application/json",
    },
});

const apiOrigin = new URL(apiBaseUrl, window.location.origin).origin;

function resolveStorageUrls(value) {
    if (typeof value === "string") {
        return value.startsWith("/storage/")
            ? new URL(value, apiOrigin).toString()
            : value;
    }

    if (Array.isArray(value)) return value.map(resolveStorageUrls);

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, resolveStorageUrls(item)]),
        );
    }

    return value;
}

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        if (typeof Blob === "undefined" || !(response.data instanceof Blob)) {
            response.data = resolveStorageUrls(response.data);
        }
        return response;
    },
    (error) => {
        if (
            error.response?.status === 401 &&
            error.config?.url !== "/login" &&
            localStorage.getItem("token")
        ) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            if (window.location.pathname !== "/login") {
                window.location.assign("/login");
            }
        }

        return Promise.reject(error);
    }
);

export default api;

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = dirname(fileURLToPath(import.meta.url));
const loopbackHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const productionApiUrl = "https://api.cryma.store/api";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, webRoot, "");
    const apiTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000";
    let apiUrl = env.VITE_API_URL?.trim() || "";

    if (mode === "production") {
        if (!apiUrl) {
            apiUrl = productionApiUrl;
        } else {
            let parsedApiUrl;
            try {
                parsedApiUrl = new URL(apiUrl);
            } catch {
                throw new Error("VITE_API_URL must be an absolute HTTPS URL in production.");
            }

            if (loopbackHosts.has(parsedApiUrl.hostname)) {
                apiUrl = productionApiUrl;
            } else if (parsedApiUrl.protocol !== "https:") {
                throw new Error("VITE_API_URL must use HTTPS in production.");
            }
        }
    }

    return {
        plugins: [react()],
        define: {
            "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl),
        },
        server: {
            host: "0.0.0.0",
            port: 5173,
            strictPort: true,
            proxy: {
                "/api": {
                    target: apiTarget,
                    changeOrigin: true,
                },
                "/storage": {
                    target: apiTarget,
                    changeOrigin: true,
                },
            },
        },
    };
});

import axios from "axios";
import { secrets } from "../../lib/config";
import url from "url";

// Make sure FIXIE_URL exists
if (!secrets.FIXIE_URL) {
    throw new Error("FIXIE_URL is required in config");
}

const fixieUrl = url.parse(secrets.FIXIE_URL);

// Check if fixieUrl and auth exist
if (!fixieUrl || !fixieUrl.auth) {
    throw new Error("Invalid FIXIE_URL format - missing authentication");
}

const fixieAuth = fixieUrl.auth.split(":");

export const localAPIClient = axios.create({
    baseURL: "http://localhost:3000/api/v1",
    headers: {
        "Content-Type": "application/json",
    },
});

// Validate proxy settings
if (!fixieUrl?.hostname || !fixieUrl?.port || !fixieAuth[0] || !fixieAuth[1]) {
    throw new Error("Invalid proxy configuration - missing required fields");
}

export const clashRoyaleAPIClient = axios.create({
    baseURL: "https://api.clashroyale.com/v1",
    headers: {
        "Content-Type": "application/json",
    },
    proxy: {
        protocol: "http",
        host: fixieUrl.hostname,
        port: Number(fixieUrl.port),
        auth: {
            username: fixieAuth[0],
            password: fixieAuth[1],
        },
    },
});

clashRoyaleAPIClient.interceptors.request.use(
    (config) => {
        const token = secrets.CLASH_ROYALE_API;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

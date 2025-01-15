import axios from "axios";
import { secrets } from "../../lib/config";

export const localAPIClient = axios.create({
    baseURL: "http://localhost:3000/api/v1",
    headers: {
        "Content-Type": "application/json",
    },
});

export const clashRoyaleAPIClient = axios.create({
    baseURL: "https://api.clashroyale.com/v1",
    headers: {
        "Content-Type": "application/json",
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

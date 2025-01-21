import axios from "axios";
import { secrets } from "../../lib/config";
import url from "url";

const fixieUrl = url.parse("http://fixie:xkF6NQoFyyGZ223@criterium.usefixie.com:80");

const fixieAuth = (fixieUrl?.auth ?? "").split(":");

export const localAPIClient = axios.create({
    baseURL: "https://catoff-rouge.vercel.app/api/v1",
    headers: {
        "Content-Type": "application/json",
    },
});


export const clashRoyaleAPIClient = axios.create({
    baseURL: "https://api.clashroyale.com/v1",
    headers: {
        "Content-Type": "application/json",
    },
    proxy: {
        protocol: "http",
        host: fixieUrl.hostname!,
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

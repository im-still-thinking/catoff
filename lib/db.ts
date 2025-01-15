import Redis from "ioredis";
import { secrets } from "./config";

export const redisClient = new Redis({
  host: secrets.REDIS_URI,
  port: secrets.REDIS_PORT,
  username: secrets.REDIS_USERNAME,
  password: secrets.REDIS_PASSWORD,
});

redisClient.on('connect',() => {
  console.log('connected to redis successfully!');
})

redisClient.on('error',(error) => {
  console.log('Redis connection error :', error);
})

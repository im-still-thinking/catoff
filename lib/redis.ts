import Redis from "ioredis";
import { secrets } from "./config";

class RedisClientSingleton {
  private static instance: Redis | null = null;

  private constructor() {}

  public static getInstance(): Redis {
    if (!RedisClientSingleton.instance) {
      RedisClientSingleton.instance = new Redis({
        host: secrets.REDIS_URI,
        port: secrets.REDIS_PORT,
        username: secrets.REDIS_USERNAME,
        password: secrets.REDIS_PASSWORD,
      });

      RedisClientSingleton.instance.on('connect', () => {
        console.log('connected to redis successfully!');
      });

      RedisClientSingleton.instance.on('error', (error) => {
        console.log('Redis connection error :', error);
      });
    }

    return RedisClientSingleton.instance;
  }
}

export const redisClient = RedisClientSingleton.getInstance();
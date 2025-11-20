import "dotenv/config";
import { databaseConfig } from "../src/config/database";
import { redisConfig } from "../src/config/redis";

beforeAll(async () => {
  process.env.MONGODB_URI =
    process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/shrig_db";
  await databaseConfig.connect();
  await redisConfig.connect();
});

afterAll(async () => {
  await databaseConfig.disconnect();
  await redisConfig.disconnect();
});

jest.setTimeout(30000);

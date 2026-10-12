import "./env";
import { MongoClient, type Db } from "mongodb";

export const databaseConfig = {
  uri: process.env.MONGODB_URI,
  name: process.env.MONGODB_DB_NAME ?? "resume_rag"
} as const;

let client: MongoClient | undefined;
let connectionPromise: Promise<MongoClient> | undefined;

const getClient = async (): Promise<MongoClient> => {
  if (!databaseConfig.uri) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (client) {
    return client;
  }

  connectionPromise ??= MongoClient.connect(databaseConfig.uri);

  try {
    client = await connectionPromise;
    return client;
  } catch (error) {
    connectionPromise = undefined;
    throw error;
  }
};

export const getDatabase = async (): Promise<Db> => {
  const connectedClient = await getClient();
  return connectedClient.db(databaseConfig.name);
};

export const checkDatabaseConnection = async (): Promise<number> => {
  const startedAt = Date.now();
  const database = await getDatabase();

  await database.command({ ping: 1 });
  database.collection("resumes");

  return Date.now() - startedAt;
};
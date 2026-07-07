import { MongoClient, type Db } from "mongodb";

if (!process.env.MONGO_URI) {
  throw new Error(
    "Please define the MONGO_URI environment variable inside .env"
  );
}

const uri = process.env.MONGO_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  // In development, use a global variable so the MongoClient is not
  // repeatedly instantiated during hot-reloads.
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new client for each instance.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * Returns the connected MongoClient instance.
 */
export async function getClient(): Promise<MongoClient> {
  return clientPromise;
}

/**
 * Returns the default database from the connection string.
 */
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db();
}

export default clientPromise;

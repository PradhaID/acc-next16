import { getDb } from "./mongodb";
import { DEFAULT_SETTINGS } from "@/lib/models/system/setting";

let cached: Record<string, any> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60 seconds

async function loadAll(): Promise<Record<string, any>> {
  const now = Date.now();
  if (cached && now - cacheTime < CACHE_TTL) return cached;

  const db = await getDb();
  const col = db.collection("systemSettings");
  const docs = await col.find({}).toArray();

  const map: Record<string, any> = {};
  for (const doc of docs) {
    map[doc.key] = doc.value;
  }

  // Fill defaults for missing keys
  for (const def of DEFAULT_SETTINGS) {
    if (!(def.key in map)) {
      map[def.key] = def.value;
    }
  }

  cached = map;
  cacheTime = now;
  return map;
}

export async function getSetting(key: string): Promise<any> {
  const all = await loadAll();
  return all[key];
}

export async function getSettings(): Promise<Record<string, any>> {
  return loadAll();
}

export async function setSetting(key: string, value: any): Promise<void> {
  const db = await getDb();
  const col = db.collection("systemSettings");
  await col.updateOne(
    { key },
    { $set: { key, value, updatedAt: new Date() } },
    { upsert: true }
  );
  cached = null; // invalidate cache
}

export async function setSettings(settings: Record<string, any>): Promise<void> {
  const db = await getDb();
  const col = db.collection("systemSettings");
  const ops = Object.entries(settings).map(([key, value]) => ({
    updateOne: {
      filter: { key },
      update: { $set: { key, value, updatedAt: new Date() } },
      upsert: true,
    },
  }));
  if (ops.length > 0) await col.bulkWrite(ops);
  cached = null;
}

export async function initSettings(): Promise<void> {
  const db = await getDb();
  const col = db.collection("systemSettings");
  for (const def of DEFAULT_SETTINGS) {
    const exists = await col.findOne({ key: def.key });
    if (!exists) {
      await col.insertOne({
        ...def,
        updatedAt: new Date(),
      } as any);
    }
  }
  cached = null;
}

export async function refreshSettings(): Promise<void> {
  cached = null;
}

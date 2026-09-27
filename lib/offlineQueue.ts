'use client';

/**
 * Minimal IndexedDB-backed queue for writes made while offline — scoped
 * to exactly what System Design §8 / Flow E ("Offline at the gym")
 * needs: logging a set must never fail just because the gym's wifi
 * dropped. Sets queue here, then flush automatically once the browser's
 * `online` event fires (see hooks/useWorkoutSession.ts).
 */
import { openDB, type IDBPDatabase } from 'idb';
import type { NewSet } from './database.types';

const DB_NAME = 'gymtracker-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-sets';

export interface QueuedSet {
  /** Client-generated id, used as the set's optimistic id until it syncs. */
  localId: string;
  input: NewSet;
  queuedAt: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('offlineQueue requires a browser environment');
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'localId' });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueSet(entry: QueuedSet): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, entry);
}

export async function getQueuedSets(): Promise<QueuedSet[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function removeQueuedSet(localId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, localId);
}

export async function getQueueLength(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_NAME);
}

/**
 * Replays queued sets in order through `syncOne` (a real insert),
 * removing each as it succeeds. Stops at the first failure — leaving
 * the rest queued — rather than risk reordering or dropping sets.
 */
export async function flushQueue(syncOne: (input: NewSet) => Promise<unknown>): Promise<number> {
  const pending = await getQueuedSets();
  let synced = 0;
  for (const entry of pending) {
    try {
      await syncOne(entry.input);
      await removeQueuedSet(entry.localId);
      synced += 1;
    } catch {
      break; // still offline, or a real error — retried on the next 'online' event
    }
  }
  return synced;
}

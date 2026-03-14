import { getRedis } from "./redis";
import type { TeeTime } from "./pollers/types";

export interface DiffResult {
  newTimes: TeeTime[];
  changed: boolean;
}

export async function diffAndDetectNew(
  courseId: string,
  targetDate: string,
  currentTimes: TeeTime[]
): Promise<DiffResult> {
  const cacheKey = `teetimes:${courseId}:${targetDate}`;

  const redis = getRedis();

  // Get previous snapshot from Redis
  const previous: string[] = (await redis.smembers(cacheKey)) || [];
  const previousSet = new Set(previous);

  // Build current time keys: "08:30|18|4" (time|holes|spots)
  const currentKeys = currentTimes.map(
    (t) => `${t.time}|${t.holes}|${t.availableSpots}`
  );
  const currentSet = new Set(currentKeys);
  const newTimes = currentTimes.filter(
    (_t, i) => !previousSet.has(currentKeys[i])
  );

  // Detect any change: arrivals (new times) or departures (removed times)
  const hasArrivals = newTimes.length > 0;
  const hasDepartures = previous.some((key) => !currentSet.has(key));
  const changed = hasArrivals || hasDepartures;

  // Update cache atomically (TTL = 2 * typical poll interval)
  if (currentKeys.length > 0) {
    const pipeline = redis.pipeline();
    pipeline.del(cacheKey);
    pipeline.sadd(cacheKey, ...(currentKeys as [string, ...string[]]));
    pipeline.expire(cacheKey, 600);
    await pipeline.exec();
  }

  return { newTimes, changed };
}

import { getRedis } from "./redis";
import type { TeeTime } from "./pollers/types";

export async function diffAndDetectNew(
  courseId: string,
  targetDate: string,
  currentTimes: TeeTime[]
): Promise<TeeTime[]> {
  const cacheKey = `teetimes:${courseId}:${targetDate}`;

  const redis = getRedis();

  // Get previous snapshot from Redis
  const previous: string[] = (await redis.smembers(cacheKey)) || [];
  const previousSet = new Set(previous);

  // Build current time keys: "08:30|18|4" (time|holes|spots)
  const currentKeys = currentTimes.map(
    (t) => `${t.time}|${t.holes}|${t.availableSpots}`
  );
  const newTimes = currentTimes.filter(
    (_t, i) => !previousSet.has(currentKeys[i])
  );

  // Update cache atomically (TTL = 2 * typical poll interval)
  if (currentKeys.length > 0) {
    const pipeline = redis.pipeline();
    pipeline.del(cacheKey);
    pipeline.sadd(cacheKey, ...(currentKeys as [string, ...string[]]));
    pipeline.expire(cacheKey, 120);
    await pipeline.exec();
  }

  return newTimes;
}

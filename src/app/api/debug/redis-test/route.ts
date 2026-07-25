import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return NextResponse.json({ error: 'no config' });

  const redis = new Redis({ url, token });

  const knownKey = 'intel:health:council-eu-rss';
  const directVal = await redis.get(knownKey);
  const keys = await redis.keys('intel:health:*');

  const individual: Record<string, string> = {};
  for (const k of keys.slice(0, 5)) {
    const v = await redis.get(k);
    individual[k] = typeof v;
  }

  return NextResponse.json({
    directExists: directVal !== null && directVal !== undefined,
    keysFound: keys.length,
    individualTypes: individual,
  });
}

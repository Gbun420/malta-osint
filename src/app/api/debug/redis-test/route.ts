import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return NextResponse.json({ error: 'no config' });

  const redis = new Redis({ url, token });

  const eventKeys = await redis.keys('intel:event:*');
  const healthKeys = await redis.keys('intel:health:*');
  const evidenceKeys = await redis.keys('intel:evidence:*');

  return NextResponse.json({
    eventCount: eventKeys.length,
    eventKeys: eventKeys.slice(0, 5).map(k => k.slice(12)),
    healthCount: healthKeys.length,
    healthKeys: healthKeys.map(k => k.slice(12)),
    evidenceCount: evidenceKeys.length,
  });
}

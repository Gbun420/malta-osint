import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_BASE = 'https://api.elevenlabs.io/v1';

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (process.env.ENABLE_ELEVENLABS !== 'true') {
    return errorResponse('Audio intelligence is disabled', 503);
  }

  const credential = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!credential || !voiceId) {
    return errorResponse('ElevenLabs is not fully configured', 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON request', 400);
  }

  const text = typeof (body as { text?: unknown })?.text === 'string'
    ? (body as { text: string }).text.trim()
    : '';
  const maxCharacters = Number(process.env.ELEVENLABS_MAX_CHARACTERS || 5000);

  if (!text) return errorResponse('Briefing text is required', 400);
  if (text.length > maxCharacters) {
    return errorResponse(`Briefing exceeds the ${maxCharacters}-character limit`, 413);
  }

  const modelId = process.env.ELEVENLABS_TTS_MODEL || 'eleven_flash_v2_5';
  const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128';

  const upstream = await fetch(
    `${API_BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': credential,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, model_id: modelId }),
      signal: AbortSignal.timeout(60_000),
    },
  );

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    console.error('[ElevenLabs TTS] Upstream error', upstream.status, detail.slice(0, 500));
    return errorResponse(`Narration provider returned ${upstream.status}`, 502);
  }

  const audio = await upstream.arrayBuffer();
  const contentHash = createHash('sha256').update(text).digest('hex');
  const characterCost = upstream.headers.get('character-cost');

  return new NextResponse(audio, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
      'Content-Length': String(audio.byteLength),
      'Cache-Control': 'private, max-age=86400',
      'X-Audio-Content-Hash': contentHash,
      'X-Audio-Model': modelId,
      ...(characterCost ? { 'X-ElevenLabs-Character-Cost': characterCost } : {}),
    },
  });
}

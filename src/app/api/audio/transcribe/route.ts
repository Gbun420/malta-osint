import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
const ALLOWED_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'video/mp4',
  'video/webm',
]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (process.env.ENABLE_ELEVENLABS !== 'true') {
    return jsonError('Audio intelligence is disabled', 503);
  }

  const credential = process.env.ELEVENLABS_API_KEY;
  if (!credential) return jsonError('ElevenLabs is not configured', 503);

  const incoming = await request.formData();
  const file = incoming.get('file');
  if (!(file instanceof File)) return jsonError('An audio or video file is required', 400);

  const maxUploadBytes = Number(process.env.ELEVENLABS_MAX_UPLOAD_BYTES || 26214400);
  if (file.size <= 0) return jsonError('The uploaded file is empty', 400);
  if (file.size > maxUploadBytes) {
    return jsonError(`File exceeds the ${Math.round(maxUploadBytes / 1024 / 1024)} MB limit`, 413);
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return jsonError(`Unsupported media type: ${file.type}`, 415);
  }

  const upstreamForm = new FormData();
  upstreamForm.set('file', file, file.name);
  upstreamForm.set('model_id', process.env.ELEVENLABS_STT_MODEL || 'scribe_v2');
  upstreamForm.set('diarize', incoming.get('diarize') === 'false' ? 'false' : 'true');
  upstreamForm.set('tag_audio_events', incoming.get('tag_audio_events') === 'false' ? 'false' : 'true');

  const languageCode = incoming.get('language_code');
  if (typeof languageCode === 'string' && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(languageCode)) {
    upstreamForm.set('language_code', languageCode);
  }

  const upstream = await fetch(API_URL, {
    method: 'POST',
    headers: { 'xi-api-key': credential },
    body: upstreamForm,
    signal: AbortSignal.timeout(120_000),
  });

  const responseText = await upstream.text();
  if (!upstream.ok) {
    console.error('[ElevenLabs STT] Upstream error', upstream.status, responseText.slice(0, 500));
    return jsonError(`Transcription provider returned ${upstream.status}`, 502);
  }

  try {
    const transcript = JSON.parse(responseText);
    return NextResponse.json({
      provider: 'ElevenLabs',
      model: process.env.ELEVENLABS_STT_MODEL || 'scribe_v2',
      createdAt: new Date().toISOString(),
      transcript,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return jsonError('Transcription provider returned invalid JSON', 502);
  }
}

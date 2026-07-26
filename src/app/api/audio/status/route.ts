import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const enabled = process.env.ENABLE_ELEVENLABS === 'true';
  const configured = enabled && Boolean(process.env.ELEVENLABS_API_KEY);
  const voiceConfigured = Boolean(process.env.ELEVENLABS_VOICE_ID);

  return NextResponse.json({
    enabled,
    configured,
    voiceConfigured,
    ttsModel: process.env.ELEVENLABS_TTS_MODEL || 'eleven_flash_v2_5',
    sttModel: process.env.ELEVENLABS_STT_MODEL || 'scribe_v2',
    maxCharacters: Number(process.env.ELEVENLABS_MAX_CHARACTERS || 5000),
    maxUploadBytes: Number(process.env.ELEVENLABS_MAX_UPLOAD_BYTES || 26214400),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

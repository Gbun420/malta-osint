'use client';

import { useState, useEffect } from 'react';
import AudioIntelligence from '@/components/intelligence/AudioIntelligence';

interface AudioStatus {
  enabled: boolean;
  configured: boolean;
  voiceConfigured: boolean;
  ttsModel: string;
  sttModel: string;
  maxCharacters: number;
  maxUploadBytes: number;
}

export default function Audio() {
  const [status, setStatus] = useState<AudioStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audio/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Audio Intelligence</h1>
        <div className="flex items-center gap-2">
          {loading ? (
            <span className="text-xs text-white/30">Checking status...</span>
          ) : (
            <>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                status?.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {status?.enabled ? 'Enabled' : 'Disabled'}
              </span>
              {status?.configured && status?.voiceConfigured ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                  Configured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
                  Partial Config
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {status && !status.enabled && (
        <div className="glass-panel p-6 text-center">
          <MicIcon />
          <p className="text-white/50 text-lg font-medium mb-2">Audio Intelligence is Disabled</p>
          <p className="text-white/30 text-sm mb-4">
            Set <code className="text-gold/80 bg-white/5 px-1.5 py-0.5 rounded">ENABLE_ELEVENLABS=true</code> in your environment to enable audio transcription and briefing capabilities.
          </p>
          <div className="max-w-md mx-auto space-y-2 text-left text-xs text-white/40">
            <div className="flex justify-between px-3 py-1.5 bg-white/5 rounded">
              <span>ENABLE_ELEVENLABS</span>
              <span className={status.enabled ? 'text-green-400' : 'text-red-400'}>{String(status.enabled)}</span>
            </div>
            <div className="flex justify-between px-3 py-1.5 bg-white/5 rounded">
              <span>ELEVENLABS_API_KEY</span>
              <span className={status.configured ? 'text-green-400' : 'text-red-400'}>{status.configured ? '✓ Set' : '✗ Missing'}</span>
            </div>
            <div className="flex justify-between px-3 py-1.5 bg-white/5 rounded">
              <span>ELEVENLABS_VOICE_ID</span>
              <span className={status.voiceConfigured ? 'text-green-400' : 'text-red-400'}>{status.voiceConfigured ? '✓ Set' : '✗ Missing'}</span>
            </div>
            <div className="flex justify-between px-3 py-1.5 bg-white/5 rounded">
              <span>TTS Model</span>
              <span>{status.ttsModel}</span>
            </div>
            <div className="flex justify-between px-3 py-1.5 bg-white/5 rounded">
              <span>STT Model</span>
              <span>{status.sttModel}</span>
            </div>
            {status.maxCharacters > 0 && (
              <div className="flex justify-between px-3 py-1.5 bg-white/5 rounded">
                <span>Max Characters</span>
                <span>{status.maxCharacters.toLocaleString()}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-white/20 mt-4">Server-side ElevenLabs calls only. No permanent recording storage.</p>
        </div>
      )}

      {status && status.enabled && !status.configured && (
        <div className="glass-panel p-6 text-center">
          <MicIcon />
          <p className="text-white/50 text-lg font-medium mb-2">ElevenLabs Not Fully Configured</p>
          <p className="text-white/30 text-sm">
            API key or voice ID is missing. Audio features will be limited until configuration is complete.
          </p>
        </div>
      )}

      {(status?.enabled && status?.configured && status?.voiceConfigured) ? (
        <AudioIntelligence />
      ) : !loading && !status?.enabled ? null : (
        <div className="glass-panel p-6 text-center text-white/30 text-sm">
          <MicIcon />
          <p>Audio features ready but awaiting configuration.</p>
        </div>
      )}

      <div className="text-xs text-white/30 flex items-center gap-4 pt-2 border-t border-white/5">
        <span>API: /api/audio/status, /api/audio/briefing, /api/audio/transcribe</span>
        <span>Provider: ElevenLabs</span>
        <span>Server-side TTS/STT only</span>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg className="w-12 h-12 mx-auto mb-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

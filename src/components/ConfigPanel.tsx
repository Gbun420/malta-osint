'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, X, RefreshCw, CheckCircle, AlertTriangle, XCircle, Save, Eye, EyeOff, Key
} from 'lucide-react';

interface ProviderStatus {
  configured: boolean;
}

interface ConfigResponse {
  providers: Record<string, ProviderStatus>;
}

const PROVIDER_INFO: Record<string, { label: string; envVars: string[]; color: string; group: string }> = {
  aisstream: { label: 'AIS Stream (Maritime)', envVars: ['AIS_API_KEY'], color: '#00E5FF', group: 'data' },
  vesselapi: { label: 'VesselAPI (Satellite)', envVars: ['VESSEL_API_KEY'], color: '#00E5FF', group: 'data' },
  firms: { label: 'NASA FIRMS (Fires)', envVars: ['FIRMS_API_KEY'], color: '#FF9500', group: 'data' },
  gemini: { label: 'Gemini AI', envVars: ['GEMINI_API_KEY_1'], color: '#D4AF37', group: 'ai' },
  redis: { label: 'Redis (Persistence)', envVars: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'], color: '#D4AF37', group: 'data' },
  elevenlabs: { label: 'ElevenLabs (TTS)', envVars: ['ELEVENLABS_API_KEY'], color: '#D4AF37', group: 'ai' },
  opensky: { label: 'OpenSky (Aviation)', envVars: ['OPENSKY_CLIENT_ID', 'OPENSKY_CLIENT_SECRET'], color: '#00E5FF', group: 'data' },
  scanner: { label: 'Scanner Backend', envVars: ['SCANNER_URL', 'SCANNER_KEY'], color: '#FF3D3D', group: 'scanner' },
  ollama: { label: 'Ollama (Local LLM)', envVars: ['OLLAMA_HOST', 'OLLAMA_MODEL'], color: '#00E676', group: 'ai' },
};

const GROUP_LABELS: Record<string, string> = {
  ai: 'AI & Language',
  data: 'Data Sources',
  scanner: 'Infrastructure',
};

export default function ConfigPanel({ onClose }: { onClose: () => void }) {
  const [providers, setProviders] = useState<Record<string, ProviderStatus> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [fingerprint] = useState(() => {
    if (typeof window === 'undefined') return '';
    let fp = localStorage.getItem('malta-osint-fingerprint');
    if (!fp) { fp = crypto.randomUUID(); localStorage.setItem('malta-osint-fingerprint', fp); }
    return fp;
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data: ConfigResponse = await res.json();
      setProviders(data.providers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    setAuthError(null);
    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-device-fingerprint': fingerprint,
        },
        body: JSON.stringify(editValues),
      });
      if (res.status === 401) {
        setAuthError('Device not authorised — set CONFIG_FINGERPRINT on server');
        setSaveStatus('error');
        return;
      }
      if (res.ok) {
        setSaveStatus('ok');
        setTimeout(() => { setSaveStatus('idle'); setEditMode(false); load(); }, 1500);
      } else {
        const data = await res.json();
        setAuthError(data.error || 'Save failed');
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const configuredCount = providers
    ? Object.values(providers).filter(p => p.configured).length
    : 0;
  const totalCount = providers ? Object.keys(providers).length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="glass-panel w-[420px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-secondary)] bg-black/40 shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-[var(--gold-primary)]" />
          <span className="text-[12px] font-mono text-[var(--text-heading)] uppercase tracking-wider">Provider Keys</span>
          {providers && (
            <span className="text-[9px] font-mono text-[var(--text-muted)]">
              {configuredCount}/{totalCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditMode(!editMode); setAuthError(null); setEditValues({}); }}
            className={`px-2 py-1 rounded text-[9px] font-mono tracking-wider transition-colors ${
              editMode ? 'bg-[var(--gold-primary)]/20 text-[var(--gold-primary)]' : 'bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title={editMode ? 'Exit edit mode' : 'Edit configuration'}
          >
            <Key className="w-3 h-3 inline mr-1" />{editMode ? 'DONE' : 'EDIT'}
          </button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-red-500/20 transition-colors" title="Close">
            <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto styled-scrollbar px-4 py-3 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-[11px] font-mono text-red-400">{error}</p>
            <button onClick={load} className="mt-3 px-3 py-1.5 text-[10px] font-mono bg-white/10 rounded-lg hover:bg-white/20">
              Retry
            </button>
          </div>
        ) : editMode ? (
          <>
            {authError && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-[9px] font-mono text-red-400">{authError}</p>
              </div>
            )}
            <AnimatePresence>
              {Object.entries(PROVIDER_INFO).map(([name, info]) => {
                const configured = providers?.[name]?.configured;
                return (
                  <motion.div
                    key={name}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-[var(--border-secondary)] overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-3 py-2 bg-black/30">
                      <span className="text-[9px] font-mono tracking-wider" style={{ color: info.color }}>{info.label}</span>
                      {configured ? (
                        <span className="text-[8px] font-mono text-[var(--alert-green)]">CONFIGURED</span>
                      ) : (
                        <span className="text-[8px] font-mono text-[var(--text-muted)]">UNSET</span>
                      )}
                    </div>
                    <div className="px-3 py-2 space-y-2">
                      {info.envVars.map(envVar => (
                        <div key={envVar}>
                          <label className="text-[8px] font-mono text-[var(--text-muted)] block mb-0.5">{envVar}</label>
                          <div className="flex gap-1">
                            <input
                              type={revealed[envVar] ? 'text' : 'password'}
                              value={editValues[envVar] ?? ''}
                              onChange={e => setEditValues(v => ({ ...v, [envVar]: e.target.value }))}
                              placeholder={configured ? '••••••••' : `Set ${envVar}`}
                              className="flex-1 bg-[var(--bg-primary)]/60 border border-[var(--border-secondary)] rounded px-2 py-1.5 text-[10px] font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40"
                            />
                            <button
                              onClick={() => setRevealed(r => ({ ...r, [envVar]: !r[envVar] }))}
                              className="px-2 rounded border border-[var(--border-secondary)] hover:bg-white/10"
                            >
                              {revealed[envVar] ? <EyeOff className="w-3 h-3 text-[var(--text-muted)]" /> : <Eye className="w-3 h-3 text-[var(--text-muted)]" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        ) : (
          Object.entries(GROUP_LABELS).map(([groupId, groupLabel]) => {
            const items = Object.entries(PROVIDER_INFO).filter(([_, info]) => info.group === groupId);
            if (items.length === 0) return null;
            return (
              <div key={groupId}>
                <div className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2">{groupLabel}</div>
                <div className="space-y-1.5">
                  {items.map(([name, info]) => {
                    const configured = providers?.[name]?.configured;
                    return (
                      <div key={name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/30 border border-[var(--border-secondary)]">
                        <span className="text-[10px] font-mono text-[var(--text-secondary)]">{info.label}</span>
                        {configured ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-[var(--alert-green)]" />
                            <span className="text-[8px] font-mono text-[var(--alert-green)]">READY</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-[var(--text-muted)]" />
                            <span className="text-[8px] font-mono text-[var(--text-muted)]">UNSET</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-[var(--border-secondary)] bg-black/40 space-y-2">
        {editMode && (
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[10px] font-mono tracking-wider font-bold transition-all disabled:opacity-40 ${
              saveStatus === 'ok'
                ? 'bg-[var(--alert-green)]/20 border border-[var(--alert-green)]/40 text-[var(--alert-green)]'
                : 'bg-[var(--gold-primary)]/15 border border-[var(--gold-primary)]/40 text-[var(--gold-primary)] hover:bg-[var(--gold-primary)]/25'
            }`}
          >
            {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : saveStatus === 'ok' ? <CheckCircle className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            {saveStatus === 'ok' ? 'SAVED — restart dev server' : saving ? 'SAVING…' : 'SAVE TO .ENV.LOCAL'}
          </button>
        )}
        <p className="text-[8px] font-mono text-[var(--text-muted)] text-center">
          {editMode
            ? 'Changes saved to .env.local. Use Vercel dashboard for production.'
            : 'Configuration managed via environment variables. Click EDIT to configure locally.'}
        </p>
      </div>
    </motion.div>
  );
}

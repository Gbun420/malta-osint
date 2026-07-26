'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Endpoint {
  path?: string;
  methods?: string[];
  description?: string;
  auth?: string;
  cache?: string;
  params?: Record<string, string>;
  responseShape?: any;
}

interface Section {
  section?: string;
  endpoints?: Endpoint[];
  path?: string;
  methods?: string[];
  description?: string;
  auth?: string;
  cache?: string;
  params?: Record<string, string>;
  responseShape?: any;
}

interface Docs {
  title: string;
  version: string;
  baseUrl: string;
  endpoints: Section[];
}

function EndpointCard({ ep, baseUrl }: { ep: Endpoint; baseUrl: string }) {
  const [showResp, setShowResp] = useState(false);
  return (
    <div className="border border-[var(--border-secondary)] rounded-lg p-4 hover:border-[var(--gold-primary)]/40 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono text-[var(--gold-primary)] font-semibold">
              {(ep.methods || ['GET']).join(', ')}
            </span>
            <code className="text-[11px] font-mono text-[var(--cyan-primary)]">{ep.path}</code>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{ep.description}</p>
          {ep.params && (
            <div className="mt-2">
              <span className="text-[9px] font-mono text-[var(--text-muted)]">PARAMS:</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(ep.params).map(([k, v]) => (
                  <code key={k} className="text-[9px] font-mono bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-[var(--text-muted)]">
                    {k}: {v}
                  </code>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2">
            <code className="text-[9px] font-mono text-[var(--text-muted)]">curl {baseUrl}{ep.path}</code>
            {ep.auth && ep.auth !== 'none' && (
              <span className="text-[9px] font-mono text-[var(--alert-orange)]">🔑 {ep.auth}</span>
            )}
            {ep.responseShape && (
              <button
                onClick={() => setShowResp(!showResp)}
                className="text-[9px] font-mono text-[var(--text-muted)] underline hover:text-[var(--text-primary)]"
              >
                {showResp ? 'hide' : 'response'} shape
              </button>
            )}
          </div>
          {showResp && ep.responseShape && (
            <pre className="mt-2 text-[9px] font-mono bg-[var(--bg-secondary)] p-2 rounded overflow-x-auto text-[var(--text-muted)]">
              {JSON.stringify(ep.responseShape, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocsPage() {
  const [docs, setDocs] = useState<Docs | null>(null);

  useEffect(() => {
    fetch('/api/docs')
      .then(r => r.json())
      .then(setDocs)
      .catch(() => {});
  }, []);

  if (!docs) {
    return (
      <div className="min-h-screen bg-[var(--bg-void)] flex items-center justify-center">
        <div className="text-[var(--text-muted)] font-mono text-sm animate-pulse">Loading API docs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-void)] text-[var(--text-primary)]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--gold-primary)] font-mono tracking-wider">{docs.title}</h1>
            <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1">v{docs.version} — Base URL: {docs.baseUrl}</p>
          </div>
          <Link
            href="/"
            className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--gold-primary)] transition-colors"
          >
            ← Back to map
          </Link>
        </div>

        <div className="space-y-10">
          {docs.endpoints.map((section, i) => {
            if (section.section) {
              const eps = section.endpoints || [];
              return (
                <section key={i}>
                  <h2 className="text-sm font-bold text-[var(--gold-primary)] font-mono tracking-wider mb-4 pb-2 border-b border-[var(--border-secondary)]">
                    {section.section}
                  </h2>
                  <div className="space-y-3">
                    {eps.map((ep, j) => (
                      <EndpointCard key={j} ep={ep} baseUrl={docs.baseUrl} />
                    ))}
                  </div>
                </section>
              );
            }
            return (
              <section key={i}>
                <EndpointCard ep={section as Endpoint} baseUrl={docs.baseUrl} />
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ship, Plane, Cloud, Flame, Newspaper, Radio,
  ChevronDown, ChevronRight, Eye, EyeOff
} from 'lucide-react';

interface MaltaLayerPanelProps {
  activeLayers: Record<string, boolean>;
  onToggle: (key: string) => void;
}

const LAYER_GROUPS = [
  {
    id: 'maritime',
    label: 'MARITIME',
    icon: Ship,
    color: 'var(--cyan-primary)',
    layers: [
      { key: 'vessels', label: 'AIS Vessels', icon: Ship },
      { key: 'omrg', label: 'OMRG Ocean Data', icon: Radio },
    ],
  },
  {
    id: 'aviation',
    label: 'AVIATION',
    icon: Plane,
    color: 'var(--gold-primary)',
    layers: [
      { key: 'flights', label: 'ADS-B Flights', icon: Plane },
    ],
  },
  {
    id: 'environment',
    label: 'ENVIRONMENT',
    icon: Cloud,
    color: 'var(--alert-orange)',
    layers: [
      { key: 'marine_weather', label: 'Marine Weather', icon: Cloud },
      { key: 'earthquakes', label: 'Seismic Activity', icon: Flame },
      { key: 'fires', label: 'Active Fires', icon: Flame },
    ],
  },
  {
    id: 'intel',
    label: 'INTELLIGENCE',
    icon: Newspaper,
    color: 'var(--alert-red)',
    layers: [
      { key: 'news', label: 'Malta News', icon: Newspaper },
    ],
  },
];

export default function MaltaLayerPanel({ activeLayers, onToggle }: MaltaLayerPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    maritime: true,
    aviation: true,
    environment: true,
    intel: true,
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const activeCount = Object.values(activeLayers).filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="absolute top-20 left-4 z-[200] w-64 glass-panel styled-scrollbar overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-secondary)]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-muted)]">LAYER CONTROL</span>
          <span className="text-[9px] font-mono text-[var(--gold-primary)]">{activeCount} ACTIVE</span>
        </div>
      </div>

      {/* Layer Groups */}
      <div className="p-2 max-h-[60vh] overflow-y-auto styled-scrollbar">
        {LAYER_GROUPS.map(group => (
          <div key={group.id} className="mb-1">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              {expandedGroups[group.id] ? (
                <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
              ) : (
                <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
              )}
              <group.icon className="w-3.5 h-3.5" style={{ color: group.color }} />
              <span className="text-[9px] font-mono tracking-[0.15em] text-[var(--text-secondary)]">
                {group.label}
              </span>
            </button>

            {/* Layer Items */}
            <AnimatePresence>
              {expandedGroups[group.id] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {group.layers.map(layer => (
                    <button
                      key={layer.key}
                      onClick={() => onToggle(layer.key)}
                      className="w-full flex items-center gap-2 pl-7 pr-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
                    >
                      <div className={`w-2 h-2 rounded-full transition-colors ${
                        activeLayers[layer.key] ? 'bg-[var(--gold-primary)]' : 'bg-[var(--text-muted)]'
                      }`} />
                      <layer.icon className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]" />
                      <span className="text-[9px] font-mono tracking-[0.1em] text-[var(--text-secondary)] flex-1 text-left">
                        {layer.label}
                      </span>
                      {activeLayers[layer.key] ? (
                        <Eye className="w-3 h-3 text-[var(--gold-primary)] opacity-60" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-[var(--text-muted)] opacity-40" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

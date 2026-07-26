# Third Eye — Global Intelligence Platform Redesign

## Scope
Worldwide intelligence dashboard for foreign affairs. Rebranded from "Malta OSINT" to "Third Eye". Consolidate 2236-line bloated CSS, fix readability, improve layout, enhance map, harden data pipeline, integrate smart system.

## Phase 1: CSS Consolidation (globals.css 2236 → ~700 lines)

### Merge Strategy
- **Keep:** Third Eye visual identity (gold/cyan/void, glassmorphism, Egyptian motif)
- **Keep:** Gotham well-structured component patterns (cards, sidebar, stat counters, badges, dividers, entry animations)
- **Strip:** All unused CSS (~100 of 120+ classes are unreferenced in TSX)
- **Consolidate:** Merge duplicate/overlapping components (pulse rings, tags/badges, splash screens, buttons)
- **Fix:** Minimum readable font sizes (bump 7px → 9px for labels, remove no text under 9px for interactive)
- **Results:** Single header section with brand, consolidated CSS variables, one set of primitives

### CSS Sections (final structure)
1. Font imports + Tailwind
2. CSS custom properties (unchanged)
3. Base reset + scrollbar
4. Glass panels (`.glass-panel`, `.glass-panel-sm`)
5. HUD text system (`.hud-text`, `.hud-label` at 9px, `.hud-value`)
6. Third Eye glow effects
7. Keyframes + animation classes (consolidated, no duplicates)
8. Map overrides
9. Layer toggle (keep premium, remove basic)
10. Risk badges (`.risk-critical/high/medium/low`)
11. Gotham component library (cards, stat counters, dividers, tags, badges, command bar, sidebar, grids, entry animation) — all kept even if unused, as design system primitives
12. Splash screen (Gotham version, remove Third Eye version)
13. Responsive breakpoints (consolidated)
14. Reduced motion

### Files changed
- `src/app/globals.css` — complete rewrite

## Phase 2: Dashboard Layout Redesign

### Current Architecture
- Everything floats absolute-positioned over the map
- Title, stats, layers, entity panel, refresh button all independent `<motion.div>` elements
- No semantic layout structure

### Target Layout
```
┌─────────────────────────────────────────┐
│  COMMAND BAR (logo, status, time, refr) │
├──────────┬───────────────────┬──────────┤
│  LAYERS  │                   │  STATS   │
│  PANEL   │       MAP         │  PANEL   │
│  (left)  │    (center)       │  (right) │
│          │                   │          │
├──────────┴───────────────────┴──────────┤
│  NEWS TICKER / STATUS BAR               │
└─────────────────────────────────────────┘
```

### Changes to `page.tsx`
- Add fixed top command bar with branding, connection AIS/API status, clock, refresh
- Move stats panel into right collapsible sidebar
- Layer panel stays left but re-styled
- Entity info panel slides into right panel
- Add bottom ticker for news headlines
- Remove floating refresh button (moved to command bar)
- Convert framer-motion splash to CSS classes (use Gotham splash rings)

### Components affected
- `src/app/page.tsx` — layout restructure
- `src/components/malta/MaltaLayerPanel.tsx` — remove framer-motion, use CSS transitions
- `src/components/GlobalStatusBar.tsx` — wire into command bar
- `src/components/malta/MaltaMap.tsx` — fill available space (not fixed)
- New `NewsTicker.tsx` — CSS animation ticker

## Phase 3: Map Layer Enhancement

### MaltaMap.tsx improvements
- Proper TypeScript types (remove `any` from props)
- Vessel color by type (cargo=cyan, tanker=gold, passenger=green)
- Flight altitude-based opacity + trail lines
- Earthquake size by magnitude
- Clustering for vessels at zoom < 11
- Consistent glass-style popups
- Legend overlay
- Right-click context menu for quick OSINT lookup

## Phase 4: Data Pipeline Resilience

### Changes
- Upstash Redis caching for each data source (30s-300s TTL)
- RSS empty-items fix: validate before returning, retry once
- Per-source retry count + last success in SourceMeta
- Graceful degradation: AIS WebSocket failure doesn't break rest
- Toast notifications for source errors

## Phase 5: Smart System Integration

### Changes
- Wire SmartSystemPanel into dashboard right-panel tab
- Connect to `/api/smart-system/status`, `/api/smart-system/recommendations`
- Show AI briefings in side panel
- "Run Analysis" button calling `/api/smart-system/run`
- Surface anomaly detections as dashboard alerts

## Key Principles
- Each phase is self-contained and deployable
- No breaking changes within a phase
- Test after each phase: `npm run build`

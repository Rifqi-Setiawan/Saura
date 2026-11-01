# SAURA — Visual & Interaction Design Specification

## 1. Visual Direction & Archetype
- **Archetype**: Dense Operations Dashboard (Monitor & Operate).
- **Inspiration**: Linear, Stripe Dashboard, Vercel console.
- **Tone**: Professional, precise, high-density, safety-first engineering tool.
- **Anti-Slop Directives**:
  - No generic purple/pink gradients or floating glassmorphism.
  - No 3-card icon clichés.
  - Explicit states for every component: `loading`, `error`, `empty`, `hover`, `active`, `disabled`.
  - Numbers, monetary amounts, and energy metrics use `tabular-nums` alignment.
  - High information density with clear structural hierarchy.

## 2. Color Palette & Semantics
- **Background Root**: `#090d16` (Deep Midnight Slate)
- **Surface Elevation 1**: `#0f172a` (Slate 900)
- **Surface Elevation 2**: `#1e293b` (Slate 800)
- **Borders & Dividers**: `#334155` (Slate 700)
- **Text Primary**: `#f8fafc` (Slate 50)
- **Text Secondary**: `#94a3b8` (Slate 400)
- **Accent Primary**: `#f59e0b` (Solar Amber 500)
- **Status Semantics**:
  - `NORMAL`: `#10b981` (Emerald 500) / Background `#064e3b40`
  - `ACTION`: `#f59e0b` (Amber 500) / Background `#78350f40`
  - `CRITICAL`: `#ef4444` (Rose 500) / Background `#7f1d1d40`
  - `NO_DATA`: `#64748b` (Slate 500) / Background `#1e293b40`

## 3. Typography
- **Stack**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Headings**: Tight tracking (`letter-spacing: -0.025em`), bold (`600` - `700`).
- **Data & Numbers**: `font-variant-numeric: tabular-nums`, monospace for ticket codes (`SA-xxx`) and UUIDs.
- **Captions & Badges**: Small caps / uppercase `11px` with `tracking: 0.05em`.

## 4. Key User Journeys
1. **Manager Journey (Bu Rina)**:
   - View 4-site grid with real-time status badges (`CRITICAL`, `ACTION`, `NORMAL`, `NO_DATA`).
   - Click site (e.g. `MA Nurul Huda`) to see 7-day energy trend, weather source, financial loss.
   - Review pending tickets (`SA-024`), inspect triage reason, approve or postpone with note.
   - Download official Weekly PDF and CSV reports.
   - Simulation control bar: view current demo date (`2026-10-26`), advance clock to `2026-10-30` to observe automated recovery.
2. **Technician Journey (Ahmad)**:
   - View assigned tasks and emergency tickets.
   - Review operator guided check answers (PLN status, indicator light, error codes).
   - Mark task completed (`DONE_BY_TECH`) with field notes.

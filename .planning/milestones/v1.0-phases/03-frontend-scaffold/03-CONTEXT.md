# Phase 3: Frontend Scaffold — Context

**Gathered:** 2026-09-19
**Status:** Ready for planning

<domain>
## Phase Boundary
Deliver an installable, runnable Vite React frontend application scaffold configured with the complete design system tokens from `DESIGN (3).md` ("Hyperstudio Style Reference"), establishing the architectural layout shell, typography, color palette, navigation, and component foundation for subsequent Phase 4 UI components.
</domain>

<decisions>
## Implementation Decisions

### Scaffolding & Language
- **D-01:** Scaffold using Vite + React (JSX) for maximum development speed, clean directory structure, and zero unnecessary build configuration overhead.

### Typography & Fonts
- **D-02:** Load Google Fonts Inter (`weights: 400, 700`) as primary display/body sans-serif and JetBrains Mono (`weight: 400`) as secondary metadata/monospace font, adhering to the standard web substitutes recommended in `DESIGN (3).md`.
- **D-03:** Enforce display headlines at 400-weight with negative letter-tracking (`-0.69px` on display 63px, `-0.31px` on heading 44px) — achieving authority through scale and tracking rather than bold shouting.

### Layout & Application Shell
- **D-04:** Establish the "Editorial Security Cockpit" layout constrained to a 1200px max-width centered column on a full-bleed Obsidian canvas (`#101010`).
- **D-05:** Structure the shell with:
  - Top Navigation Bar: Wordmark "ChainBreak", live status pill badge with Pulse Green (`#98ff38`) dot, backend API health indicator, and high-contrast action pill button.
  - Headline Display Block: Restrained display typography introducing the runtime agent invariant enforcement engine.
  - Workspace Grid Foundations: Structural 1px hairline rules in Graphite (`#212121`) defining containers for the upcoming scenario selector grid, live execution timeline, and counterfactual proof table.
- **D-06:** No drop shadows. Visual elevation is achieved exclusively through 1px hairline Graphite borders (`#212121`) and high-contrast color shifts.

### Design System Tokens & Styling
- **D-07:** Implement pure Vanilla CSS in `frontend/src/index.css` defining all CSS custom properties from `DESIGN (3).md`:
  - Canvas: Obsidian (`#101010`)
  - Deep Surface / Overlay: Carbon (`#080808`)
  - Primary Text: Chalk (`#f3f3f3`)
  - Secondary / Muted Text: Smoke (`#9c9c9c`)
  - Structural Hairline Borders: Graphite (`#212121`)
  - Border Stroke Accents: Iron (`#474747`) and Card Slate (`#3b3d45`)
  - High-Contrast Action Color: Signal White (`#ffffff`) with Obsidian (`#101010`) text
  - Outlined Icon Strokes: Compass Gold (`#6f6759`)
  - Active Status Indicator: Pulse Green (`#98ff38`)
- **D-08:** Button specifications:
  - Primary CTA: Filled white pill (`#ffffff` fill, `#101010` text, 9999px border-radius, 12px 24px padding, 14px uppercase).
  - Secondary CTA: Ghost outline button (transparent fill, 1px `#ffffff` border, `#ffffff` text, 8px radius, 10px 20px padding).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `DESIGN (3).md` — Hyperstudio Style Reference: tokens, typography, surfaces, spacing scale, button definitions, and aesthetic rules.

### Requirements & Specifications
- `.planning/PROJECT.md` — Project vision and constraints.
- `.planning/REQUIREMENTS.md` — MVP requirements and invariant guarantees.
- `.planning/ROADMAP.md` — Phase 3 deliverables and milestones.
</canonical_refs>

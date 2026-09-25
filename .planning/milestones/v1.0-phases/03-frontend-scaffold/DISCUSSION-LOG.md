# Phase 3: Frontend Scaffold — Discussion Log

**Date:** 2026-09-19
**Phase:** Phase 3 — Frontend Scaffold
**Design Reference:** `DESIGN (3).md` (Hyperstudio Style Reference)

---

### Question 1: Scaffolding Stack & Language Variant
- **Question:** Which scaffolding stack and language variant should we use for the Vite React scaffold?
- **Options Presented:**
  1. *(Recommended)* React (JSX) with Vanilla CSS tokens: Fast, lightweight, zero build configuration overhead, using the exact CSS custom properties from DESIGN (3).md.
  2. React with TypeScript (TSX): Stricter typing matching the backend Pydantic data models.
- **User Selection:** Option 1 — React (JSX) with Vanilla CSS tokens.
- **Decision:** Scaffold using standard Vite React (JSX) with fast build time and direct vanilla CSS tokens.

---

### Question 2: Typography Pairing
- **Question:** Which typography pairing should we load for the display and monospace layers?
- **Options Presented:**
  1. *(Recommended)* Google Fonts Inter (400, 700) + JetBrains Mono (400): Standard web substitutes recommended by DESIGN (3).md with negative letter-tracking (-0.69px display, -0.31px heading).
  2. Fontshare Satoshi + JetBrains Mono: Alternate modern editorial sans-serif substitute.
  3. System font stack only: Pure zero-network system UI font fallback.
- **User Selection:** Option 1 — Google Fonts Inter (400, 700) + JetBrains Mono (400).
- **Decision:** Load Inter and JetBrains Mono from Google Fonts, enforcing 400-weight on display headlines with negative letter-tracking.

---

### Question 3: Workstation Layout & Shell
- **Question:** What layout shell architecture should the Phase 3 scaffold establish for the workstation?
- **Options Presented:**
  1. *(Recommended)* Editorial Security Cockpit (1200px max-width): Sticky top navigation with wordmark and status pill, hero trajectory headline, scenario selector card grid, and live counterfactual proof panes separated by 1px #212121 hairline borders.
  2. Full-width Edge-to-Edge Console: Multi-panel terminal/IDE layout with collapsible sidebar for scenarios and persistent inspector panel.
- **User Selection:** Option 1 — Editorial Security Cockpit (1200px max-width).
- **Decision:** 1200px max-width centered column on Obsidian `#101010` canvas with top navigation bar, status pill, headline block, and hairline grid wireframe for Phase 4 components.

---

### Question 4: Design System Tokens & Styling Mechanism
- **Question:** How should the design system tokens from DESIGN (3).md be structured in the codebase?
- **Options Presented:**
  1. *(Recommended)* Pure Vanilla CSS tokens: Direct implementation of the exact CSS custom properties and surface rules from DESIGN (3).md (:root with obsidian, carbon, chalk, smoke, graphite, pulse-green).
  2. Tailwind CSS v4 with custom @theme: Utility classes mapped to the DESIGN (3).md color and font tokens.
- **User Selection:** Option 1 — Pure Vanilla CSS tokens.
- **Decision:** Complete implementation of `:root` CSS custom properties in `frontend/src/index.css` matching `DESIGN (3).md`.

# SPEC.md — Cell Care v3 Sharpism & Minimalism Redesign

> **Status**: `FINALIZED`
>
> ⚠️ **Planning Lock**: Requirements defined and locked for execution.

## Vision
Transform the Cell Care India digital portal from a generic AI-styled template into an authentic, razor-sharp, minimalist industrial battery engineering platform. The new aesthetic combines Sharpism (crisp architectural lines, hairline borders, 0–2px radii, monospace technical metrics) and Minimalism (intentional negative space, zero neon-blob fluff, fast high-contrast legibility) with pixel-exact component measurements and crisp SVG iconography for both desktop and mobile.

## Goals
1. **Eliminate AI-Generated Tropes** — Remove bubbly 14px–20px pill radiuses, cheesy radial neon glows, generic gradient borders, and floating blobs.
2. **Implement Sharpism & Minimalism** — Establish crisp geometric structural grids, hairline borders (`1px solid #1e222d`), subtle technical accents, and exact typographic hierarchy.
3. **Precise Component Measures** — Strict 8px architectural grid rhythm (exact header height, exact input heights, precise card paddings, zero loose padding drift).
4. **Sharp SVG Iconography** — Use precise, lightweight inline/embedded SVGs with consistent 1.5px/1.75px stroke geometry instead of generic icon font clutter.
5. **Rock-Solid Responsive Engineering** — Seamless layout shifts between mobile (360px–480px), tablet (768px), and desktop (1024px–1440px) with 0 horizontal overflow and touch-friendly tap targets.

## Non-Goals (Out of Scope)
- Rewriting backend API endpoints or PythonAnywhere architecture.
- Replacing the verified WhatsApp checkout mechanism (we preserve the functional dispatch logic while elevating the UI/UX).
- Introducing heavy 3rd-party CSS frameworks (Tailwind, Bootstrap) — must remain pure, lightning-fast Vanilla CSS/JS.

## Constraints
- Pure Vanilla CSS and Vanilla JavaScript.
- Must preserve live backend endpoints (`artifyscreens.pythonanywhere.com`, Google Apps Script).
- Must retain all verified business contact details (`+91 85059 10581`, `sales@cellcareindia.com`).
- Full cross-device responsiveness with zero layout shifts.

## Success Criteria
- [x] Zero round pill buttons or floating blur blobs.
- [x] All card and container radiuses strictly 0px to 3px max.
- [x] Exact component heights and spacing documented and implemented across all components.
- [x] Clean inline SVGs used for core icons (lightning, battery, shield, WhatsApp, chevron, cart).
- [x] 100% mobile responsive verified across 375px viewport with zero overflow and intuitive touch navigation.

---

*Last updated: 2026-10-13*

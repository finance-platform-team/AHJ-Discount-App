# Synapse / HMIS Design System — Guidelines

A portable reference extracted from the `hmis-design-system` project (v3.0.0), for reuse in future Claude conversations after this project folder is removed. Paste or attach this file to give Claude the full visual and interaction contract before generating any HMIS-style UI.

---

## 1. What this system is

- Product: **Synapse** — the HMIS (Hospital/Health Management Information System) Visual Design System.
- This repo is a **generated, read-only distribution**. The canonical source lives in the HMIS `main` repository; this copy is for preview/reference only and does not sync back.
- Stack: React 18 + Tailwind (preview only) + plain CSS custom properties (`--ds-*` tokens). Production target is **Angular + PrimeNG 20** — PrimeNG must be re-skinned to match this system, never the other way around.
- Framework boundary: **component behavior, states, token names, accessibility rules, and Figma properties are framework-neutral.** React/Tailwind here are only a preview harness.

---

## 2. Core principle: token-first

Never hardcode colors, type sizes, radii, or shadows in a new component. Always reference the design tokens (`--ds-*` custom properties) below. Legacy `--synapse-*`, `--ink`, `--muted`, `--line`, `--surface`, `--shadow-*` variables are the original brand variables the tokens alias — treat `--ds-*` as the authoritative names going forward.

---

## 3. Color system

### 3.1 Brand lanes (meaning-coded — do not mix)
The system encodes **three distinct "lanes" of functionality by color**. This is a strict semantic rule, not decoration:

| Lane | Color | Use for |
|---|---|---|
| **System / deterministic** | **Teal** (`--ds-color-primary`) | Standard deterministic app behavior, primary actions, navigation, default UI |
| **Analytics** | **Gold** (`--ds-color-analytics`) | Reporting, KPIs, analytics dashboards, non-AI statistical insight |
| **AI** | **Purple** (`--ds-color-ai`) | Genuine predictive or generative AI features only — never for plain analytics or deterministic logic |

> Rule: keep deterministic system behavior teal, analytics gold, and genuine predictive/generative AI purple. Do not borrow AI purple to make a normal feature look "smart."

### 3.2 Primary (Teal) scale
```
--ds-color-primary:        #126e5c   (600 — current product Primary)
--ds-color-primary-deep:   #023635
--ds-color-primary-soft:   #d9f8ec
--ds-color-primary-mint:   #40ffb8   (accent highlight)
--ds-color-primary-line:   rgba(18,110,92,.14)

50  #f0faf7   100 #d9f3ea   200 #b7e7d7   300 #82d2ba   400 #4bb69a
500 #278f76   600 #126e5c   700 #0d594b   800 #0a463c   900 #073a33   950 #03251f
```

### 3.3 Neutral scale (tables, dialogs, Figma foundations)
```
50 #f8fafc  100 #f1f5f9  200 #e2e8f0  300 #cbd5e1  400 #94a3b8
500 #64748b 600 #475569  700 #334155  800 #1e293b  900 #0f172a
```

### 3.4 Analytics (Gold) scale
```
--ds-color-analytics:      #c99b3b
--ds-color-analytics-deep: #a07118
--ds-color-analytics-soft: #fbefd6
--ds-color-analytics-line: rgba(160,113,24,.2)
50 #fffbeb 100 #fef3c7 200 #fde68a 300 #fcd34d 400 #e7b94a
500 #c99b3b 600 #a07118 700 #815b12 800 #65450f 900 #51380f
```

### 3.5 AI (Purple) scale
```
--ds-color-ai:      #8d73de
--ds-color-ai-deep: #6046aa
--ds-color-ai-soft: #eee9fb
--ds-color-ai-line: rgba(112,82,187,.2)
50 #faf8ff 100 #eee9fb 200 #dcd2f6 300 #c5b3ee 400 #aa91e6
500 #8d73de 600 #7459c7 700 #6046aa 800 #4e398a 900 #402f70
```

### 3.6 Status colors
Generic semantic (success/warning/danger/info) each have a 50–900 scale (Tailwind-like), e.g. success `#10b981` (500), warning `#f59e0b` (500), danger `#ef4444` (500), info `#3b82f6` (500).

Clinical/workflow status tones (used for tags, badges, flags — these are distinct from generic status colors and carry specific meaning in a hospital workflow):

| Status | Text | Background |
|---|---|---|
| Routine | `#526762` | `rgba(211,222,218,.72)` |
| High | `#8f5c0d` | `rgba(255,225,160,.55)` |
| Urgent | `#a23e3e` | `rgba(255,196,196,.55)` |
| Pending | `#785e14` | `rgba(255,226,145,.46)` |
| Awaiting | `#6b4e82` | `rgba(226,214,240,.6)` |
| Success | `#176148` | `rgba(64,255,184,.2)` |
| Confirmed | `#185c67` | `rgba(185,230,235,.55)` |
| Draft | `#67736f` | `rgba(211,218,216,.75)` |
| Error | `#dc2626` | `#fef2f2` |
| Info | `#185c67` | `rgba(185,230,235,.4)` |

Each has a dark-mode equivalent (lighter text tone, darker translucent background) — see §8.

### 3.7 Surfaces & text
```
--ds-color-surface-raised:   #ffffff
--ds-color-surface-muted:    #f5f7f6
--ds-color-surface-recessed: #f1f5f9
--ds-color-surface-hover:    #f1f5f9
--ds-color-surface-selected: #eff8f4
--ds-color-surface-overlay:  rgba(3,17,15,.58)
--ds-color-text-primary:     var(--ink)
--ds-color-text-secondary:   var(--muted)
--ds-color-text-inverse:     #ffffff
--ds-color-border:           var(--line)
--ds-color-border-strong:    rgba(26,74,66,.14)
```

### 3.8 Backgrounds
App-level backgrounds are **structural atmosphere, not screen decoration** — layered radial/linear gradients (soft mint, purple, gold washes over a light neutral base) applied to the application shell, content area, side navigation, and sidebar. Never recreate this ad hoc per screen; it belongs to the shell only. The navigation/sidebar background uses a deep teal gradient (`#064642` → `#023635`) with a mint radial glow.

---

## 4. Typography

- Font family: **Urbanist**, falling back to `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`.
- Weights: regular 400, medium 500, semibold 600, bold 700.
- Line heights: tight `1.2` (headings), body `1.5`.

| Role | Size |
|---|---|
| Display | `clamp(26px, 2.4vw, 38px)` |
| Page title | `clamp(19px, 1.65vw, 24px)` |
| Intro title | `clamp(18px, 1.45vw, 20px)` |
| Section title | 18px |
| Card title | 16px |
| Item title | 14px |
| Body | 14px |
| Field label | 14px |
| Label (general) | 14px |
| Table header | 14px |
| Caption | 13px |
| Metric label | 12px |
| Eyebrow (uppercase kicker) | 12px |

Rule: **table headers and cells are both 14px, normal case** (not uppercase/letter-spaced) — this diverges from a lot of default admin-table styling, so don't uppercase table headers here.

---

## 5. Spacing, radius, shadow, motion

### Spacing (8-point grid; 4px reserved only for icon/label micro-adjustments)
```
2xs/xs: 4px   sm: 8px   md: 16px   lg: 16px   xl: 24px   2xl: 32px   3xl: 48px
```

### Radius
```
squircle-lg: 16px   squircle-sm: 12px   control/button: 8px
tag: 4px   sm: 8px   md: 12px   lg: 16px   pill: 999px   circle: 50%
```

### Shadow
```
shadow-sm:    0 13px 28px rgba(82,82,100,.11), inset 0 1px 0 rgba(255,255,255,.88)
shadow-lg:    0 30px 70px rgba(76,73,105,.19), inset 0 1px 0 rgba(255,255,255,.9)
shadow-button:       0 10px 22px rgba(2,54,53,.17), inset 0 1px 0 rgba(255,255,255,.13)
shadow-button-hover: 0 13px 28px rgba(2,54,53,.23)
shadow-dialog: 0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)
```

### Motion
```
ease-settle: cubic-bezier(.16,1,.3,1)     ease-enter: cubic-bezier(.2,.7,.2,1)
ease-exit:   cubic-bezier(.4,0,.7,.2)
duration-fast: 180ms   duration-base: 300ms   duration-slow: 460ms   duration-overlay: 560ms
```
Always respect `prefers-reduced-motion: reduce` (skeletons and similar sweep animations must disable themselves).

### Breakpoints (reference values; CSS media queries can't read vars — hardcode the number)
```
mobile: 620px   tablet: 900px   laptop: 1180px   desktop: 1400px
```

---

## 6. Fixed component dimensions (do not deviate)

- **Field controls: 44px high.** Editable-table-row controls: **32px** (`--ds-inline-control-height`).
- Buttons: small 32px / medium 40px / large 48px; font 13px/14px/14px respectively.
- **Table header row: 40px. Table row: 40px.** Header/cell padding: `8px 16px`.
- Table headers/cells: **14px, normal case** (see §4).
- Modal sizes: sm max-width 370px, md 560px, lg 980px.

---

## 7. Component inventory (public API surface)

Products/consumers must import from these public entry points — never deep-import from `components/*`.

### `hmis-design-system/design-system` (generic, product-agnostic)
`Button`, `CopyValue`/`CopyButton`, `DataTable`, `EmptyState`/`Skeleton`/`SkeletonRows`, `FormActionBar`, `Modal`/`DialogSurface`/`ModalFooter`/`ConfirmDialog`, `Pagination`, `StatusBadge`, `Tabs`, `Checkbox`/`Radio`/`RadioGroup`, `Field`/`TextInput`/`NumberInput`/`DateInput`/`Select`/`Textarea`/`Toggle`, `SectionHeader`/`PageHeader`/`CardHeader`/`Card`/`FormSection`, `GlobalFilter`/`ActiveFilterChips`/`TableFilterPopover`/`AdvancedFilterModal`, `ActionCell`/`BulkActionBar`/`InlineAddRow`, `ScoreRing`/`MiniBarChart`/`MiniLineChart`/`ChartLegend`.

### `hmis-design-system/clinical` (approved Shared HMIS/product patterns — NOT generic DS)
`Chat`, `FloatingAssistantButton`, `PatientBanner`/`PatientSafetyFlags`, `PatientList`, `ProvenanceTag`, AI kit (`AIAvailabilityBanner`, `CitationList`, `AIAssistantPanel`, `PredictionCard`, `GeneratedReportReview`, `HumanReviewGate`, plus `AI_CONTENT_TYPES`/`AI_SOURCE_TYPES`), Reporting (`ReportScopeBar`, `KpiCard`, `AnalyticsPanel`, `GeneratedReportCatalog`, `ReportingWorkspace`).

### `hmis-design-system/layout` (canonical shell)
`ApplicationShell`, `ShellHeader`, `ShellSideMenu`, `ShellBrand`, `HeaderUtilityDrawer`. Product apps supply data/routing/navigation/permissions/actions through an owning adapter — the shell renderers themselves stay canonical and product-agnostic.

### `hmis-design-system/foundations`
Product-agnostic icons and low-level adapters (icon set: `iconsax-react`).

---

## 8. Dark mode

Dark mode activates by adding the `dark-mode` class to the owning application or shell container. Key remaps (not exhaustive — every color token gets a dark equivalent):

```
surface-solid:   #1c1d22        surface-raised: #23242a
surface-muted:   #202126        surface-hover:  #2c3532
surface-selected:#173a32        text-primary:   #f1f5f3
text-secondary:  #b3bfbb        text-inverse:   #062f2a
border:          rgba(255,255,255,.08)
```
Primary/AI/Analytics "deep"/"soft"/"line" tokens invert to lighter-on-dark translucent variants (e.g. `--ds-color-primary-deep: #78d9bd` in dark vs `#023635` in light). Status colors likewise swap to lighter text over darker translucent backgrounds. Shadows deepen (larger blur, higher opacity black) instead of the light warm-white shadows.

Rule: never hand-pick one-off dark colors in a new component — use the token, and its dark-mode counterpart is already defined at the `:root`/`.dark-mode` level.

---

## 9. Clinical/HMIS-specific patterns

These are **product patterns**, not generic DS, but are approved and reusable across the HMIS product:

- **Patient Banner**: sticky patient-context header. Has a dedicated **safety flag strip** (red urgent flags, gold "high" tone, teal "info" tone, or a green "clear" state) that must remain visible even in the **compact density** variant used inside clinical workspaces — patient safety flags are never allowed to collapse away.
- **Patient List**: two-pane layout (254px scope nav + main list), with scope tabs, quick search, and per-row flags/actions using the same status tone tokens.
- **Data / Clinical Table**: shared clinical table shell — 40px header/row height, 14px normal-case text, sticky start/end columns supported, grouped rows, expandable rows, skeleton loading states, and a "scroll indicator" affordance for wide tables.
- **AI Kit**: every AI-surfaced feature must carry a `ProvenanceTag` (`is-ai` = purple lane, `is-system` = teal lane) so users always know whether content came from AI or deterministic logic. Includes `AIAvailabilityBanner` (degrade gracefully — analytics-gold-toned banner — when AI is unavailable), `CitationList`, `PredictionCard`, `GeneratedReportReview`, and `HumanReviewGate` (a human-in-the-loop confirmation gate for AI output).
- **Reporting**: gold-lane KPI cards, analytics panels, and a `GeneratedReportCatalog`/`ReportingWorkspace` — kept visually distinct from AI (purple) even though both can appear near each other on a dashboard.
- **Chat / Floating Assistant**: chat surface and a floating assistant trigger button, both part of the clinical/product layer, not the generic DS.

---

## 10. Governance rules (must follow)

1. Use existing components before adding page-local markup.
2. Do not hardcode semantic colors, type sizes, radii, or shadows in new components — always go through tokens.
3. Keep deterministic system behavior **teal**, analytics **gold**, and genuine predictive/generative AI **purple** (§3.1).
4. Keep patient safety flags visible in compact patient context.
5. Keep manual/deterministic workflows available even when optional AI is unavailable (never make AI a hard dependency for a task to be completable).
6. Table headers/cells: normal-case 14px, 40px row/header height (Figma default).
7. Field controls: 44px high; inline/editable-table-row controls: 32px.
8. Treat all showcase patient/clinical/forecast/report content as **placeholder data**, never approved business rules.
9. Do not import product components, product data, pages, app controllers, or sandbox code into Design System runtime code.
10. Product and sandbox consumers use **public APIs** only (`design-system`, `clinical`, `layout`, `foundations` entry points) — never deep-import from `components/*`.
11. PrimeNG (production Angular target) must adapt its visual language to this system — never let a component library's default theme leak through.

---

## 11. Accessibility & interaction conventions

- Focus states: a visible `box-shadow: 0 0 0 2–3px` ring using a translucent primary-teal tint (e.g. `rgba(18,110,92,.18)` or the `--ds-clinical-focus` token) on every interactive element — buttons, inputs, tabs, table sort controls, pagination.
- Disabled state: reduce opacity (~0.45–0.5) and set `cursor: not-allowed`; never rely on color alone.
- All decorative sweep/skeleton animations must honor `prefers-reduced-motion: reduce`.
- RTL support is expected: pagination direction icons and chevrons flip via `[dir="rtl"] { transform: scaleX(-1) }`-style rules — don't bake in LTR-only directional assets.
- Tables use `<caption>` (visually hidden) for accessible naming, and sticky columns get a distinguishing border + elevated background instead of only a box-shadow.

---

## 12. How to brief Claude with this file

When starting a new session/project that should look-and-feel like this HMIS system, tell Claude:
- "Follow the Synapse/HMIS Design System guidelines below" and paste this file (or attach it).
- Specify whether the target is a React/Tailwind preview (can reuse the token names/CSS approach directly) or Angular/PrimeNG production (re-skin PrimeNG components against these tokens rather than using PrimeNG's default theme).
- Remind it of the three-lane color rule (teal/gold/purple) whenever a new feature touches AI or analytics, since this is the rule most likely to be violated by a generic AI feature request.

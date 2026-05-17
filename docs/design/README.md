# Handoff: Invest — Family Wealth Management Platform

## Overview

**Invest** is a private family wealth management platform for Brazilian families that manage portfolios across multiple holders (family members) and multiple brokerages (XP, BTG, Nomad). It centralizes positions, runs alerting rules against each holder's strategy, and enforces allocation/liquidity policies.

This handoff covers **five core screens** of the product:

1. **Auth Flow** — login, register, onboarding, MFA enroll, MFA verify (5 sub-screens in one flow document)
2. **Família** — family-member management page (owner-only)
3. **Alertas** — alerts feed with severities, filters, and recommendations
4. **Estratégia** — per-holder strategy editor with view + edit modes
5. **Importar CSV** — 4-step wizard for importing brokerage CSV exports, with import history

All copy is in **pt-BR**. Currency is BRL with the format `R$ 1.183.420` (dot thousands, no decimals for large amounts), and USD/BRL exchange rates are entered manually for Nomad imports.

---

## About the Design Files

The files in `screens/` are **design references created in HTML/Tailwind** — prototypes showing intended look and behavior, **not** production code to copy directly.

The task is to **recreate these designs in the target codebase's existing environment** using its established patterns and libraries. The target codebase is a **Next.js 15 + React + TypeScript + Tailwind v4 + shadcn/ui** project (`components.json` is present at the project root, `src/` is the source tree, Supabase is wired up). Use:

- The codebase's existing `cn()` utility, shadcn `Button`, `Input`, `Card`, `Badge`, `Dialog`, etc.
- The Tailwind tokens already configured in the project (extend them with the tokens listed below if missing).
- Next.js App Router conventions for routing — file paths suggested per screen below.

If a component shown in the HTML doesn't exist yet in the codebase, build it under `src/components/` following the shadcn/Radix pattern (slots, `cva` variants, forwardRef).

---

## Fidelity

**High-fidelity.** Final colors, type, spacing, and interaction states are all expressed in the HTML and should be matched pixel-perfectly. Where the HTML uses inline `style="…"` for one-off values (e.g. avatar background hues), preserve those exact values.

---

## Design Tokens

All five screens share one token set. Add these to `globals.css` / Tailwind config if not already present.

### Color tokens (OKLCH, dark-only)

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `oklch(0.135 0 0)` | Page background |
| `--color-bg-2` | `oklch(0.175 0 0)` | Card surface |
| `--color-bg-3` | `oklch(0.208 0 0)` | Elevated / hover surface |
| `--color-line` | `oklch(0.272 0 0)` | Borders (default) |
| `--color-line-2` | `oklch(0.235 0 0)` | Subtle borders / dividers |
| `--color-text` | `oklch(0.985 0 0)` | Primary text |
| `--color-text-2` | `oklch(0.708 0 0)` | Secondary text |
| `--color-text-3` | `oklch(0.50 0 0)` | Tertiary text / muted |
| `--color-text-4` | `oklch(0.38 0 0)` | Quaternary text / labels |
| `--color-brand` | `oklch(0.62 0.20 277)` | Brand blue-violet (primary action) |
| `--color-brand-hi` | `oklch(0.70 0.20 277)` | Brand hover |
| `--color-gain` | `oklch(0.76 0.16 152)` | Gains / success / "membro" / "concluído" |
| `--color-warn` | `oklch(0.80 0.15 82)` | Warnings / "pendente" / "processando" |
| `--color-loss` | `oklch(0.68 0.20 24)` | Losses / errors / "falhou" |
| `--color-info` | `oklch(0.74 0.13 232)` | Info alerts |
| `--color-crit` | `oklch(0.66 0.22 22)` | Critical alerts |
| `--color-cons` | `oklch(0.72 0.13 232)` | Risk: conservative (blue) |
| `--color-mod`  | `oklch(0.74 0.13 175)` | Risk: moderate (teal) |
| `--color-aggr` | `oklch(0.80 0.15 60)`  | Risk: aggressive (amber) |

Semantic colors are layered as `color-mix(in oklch, var(--color-X) <pct>%, var(--color-bg))` for backgrounds and `... <pct>%, var(--color-line))` for borders — see the HTML for exact percentages per component.

### Typography

| Family | Weights | Use |
|---|---|---|
| **Geist** (Google) | 300, 400, 500, 600, 700 | All UI text |
| **Geist Mono** (Google) | 400, 500, 600 | Numbers (`.num` class), CPF, tickers, timestamps, kbd |

Class conventions: `.num` and `.mono` apply the mono family with `font-variant-numeric: tabular-nums` and `letter-spacing: -0.005em`. Always use it for currency values, percentages, CPFs, tickers, file sizes, dates/times.

Font features enabled on `body`: `font-feature-settings: "ss01", "cv11"`.

Type scale used across screens (px):

| Use | Size | Weight | Tracking |
|---|---|---|---|
| Page title (h1) | 24–26 | 500 | `-0.02em` |
| Section heading | 13.5–15 | 500 | `tight` |
| Body | 13–13.5 | 400 | `normal` |
| Secondary body | 12.5 | 400 | `normal` |
| Meta / caption | 11–11.5 | 400 | `normal` |
| Uppercase label | 10.5–11 | 500 | `0.08–0.12em` |

### Spacing

Spacing follows Tailwind's default scale (4px base). Common card padding is `p-5` (20px) or `px-5 py-4`. Settings pages cap content at `max-w-[640px]`. Wizard content caps at `max-w-[560px]`. Dashboard-style pages cap at `max-w-[1480px]`.

### Radius

| Token | Value | Use |
|---|---|---|
| Small | `6px` | Buttons, chips |
| Medium | `7–8px` | Inputs, small cards, asset icons |
| Large | `10–12px` | Card surfaces, dropzones |
| XL | `14px` | Wizard frame |
| Full | `999px` | Pills, avatars, chips |

### Shadows

Cards use a subtle inset highlight + low-spread drop:
```css
box-shadow:
  0 1px 0 oklch(1 0 0 / 0.03) inset,
  0 4px 12px oklch(0 0 0 / 0.25);
```
The auth card additionally uses:
```css
0 24px 60px -24px oklch(0 0 0 / 0.6),
0 8px 24px -12px oklch(0 0 0 / 0.4);
```

---

## Global Chrome

All authenticated screens share the same chrome:

### Left rail (fixed, `w-14`, full height)

- Brand mark at top: `size-8` rounded-md, white background, dark zigzag glyph (the line-chart SVG in every file).
- 5 icon links, `size-9` rounded-md, `text-[var(--color-text-3)]` default, `bg-[var(--color-bg-3)] text-[var(--color-text)]` active. Hover: `text-[var(--color-text)] bg-[var(--color-bg-2)]`. SVGs are 16×16, `stroke-width: 1.3–1.4`.
- Order: Dashboard → Alertas → Estratégia → Importar → Família.
- Bottom: account avatar, `size-7` rounded-full, ring-1, initials "RT" for the demo user.

### Topbar (h-12, sticky)

- Breadcrumb on the left, `text-[13px]`. Trail: `Família Tazima > <section> > <current>`. Separators are 12×12 chevrons in `text-[var(--color-text-4)]`. The last segment is `font-medium` and not a link.
- Right side: ⌘K search trigger (`btn-bare` style, with a `.kbd` for the shortcut).
- Background: `bg-[var(--color-bg)]/95 backdrop-blur` with an inset bottom hairline.

### Sidebar alert badge

When unread critical alerts exist, the Alertas rail icon shows a `min-w-[16px] h-[16px]` red pill (top-right corner, `box-shadow: 0 0 0 2px var(--color-bg)` to "cut out" from the dark rail) with the count, pulsing via `@keyframes badge-pulse`.

---

## Screens

### 1. Auth Flow (`/login`, `/register`, `/onboarding`, `/mfa/enroll`, `/mfa/verify`)

> File: `screens/Auth Flow.html` — 5 screens laid out side-by-side in one canvas for review.

**Common shell:**
- Page background: dark + a radial highlight at the top:
  ```css
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%,
      color-mix(in oklch, var(--color-brand) 8%, transparent), transparent 60%),
    var(--color-bg);
  ```
- Centered single card. `max-width: 360px` (or `400px` for onboarding). `border-radius: 12px`. Padding `~32px`.
- Logo: 28×28 white rounded square with the zigzag glyph + the word **"Invest"** at 500 weight + tagline **"Gestão patrimonial familiar"** in `text-[var(--color-text-2)]`.
- No decorative imagery — typography and whitespace do the work.

**`/login`** — Email-only → magic link.
- Single email input. Label "Email", placeholder "voce@familia.com".
- Primary button "Receber link de acesso" full width.
- Below: secondary link "Primeira vez? Criar conta".
- After submit: success state — replace form with a centered envelope icon, headline "Confira sua caixa de entrada", body "Enviamos um link mágico para `voce@familia.com`. Ele expira em 10 minutos.", small link "Não recebeu? Reenviar".

**`/register`** — Email + CPF.
- Email input + CPF input (mono font, mask applied as user types — see CPF Mask Rules below).
- Primary "Criar conta". Secondary link "Já tem conta? Entrar".
- Error state: red border on the offending input, red text below (`text-[var(--color-loss)] text-[12px] mt-1`). Show example: invalid CPF.

**`/onboarding`** — card is 400px wide.
- Fields: full name (required), nickname/apelido (required), family name (optional), CPF (optional, pre-filled if user came from `/register`).
- Helper text on apelido: "como te chamamos no app e nas notificações".
- Primary "Continuar".

**`/mfa/enroll`**
- Display the TOTP secret. Render in `font-mono`, broken into 4-char groups separated by spaces, on a `bg-[oklch(0.155_0_0)]` block with a 1px border and a copy button (right side). Example: `JBSW Y3DP EHPK 3PXP`.
- QR code placeholder (160×160) above the secret. In production, use a QR library (`qrcode.react` or similar).
- 6-digit verification input (see MFA Code Input below).
- Primary "Ativar MFA".

**`/mfa/verify`**
- Just the 6-digit input + "Confirmar". Helper text "Abra seu app autenticador e cole o código de 6 dígitos."

**CPF Mask Rules:**
```js
v = e.target.value.replace(/\D/g, '').slice(0, 11);
v = v.replace(/(\d{3})(\d)/, '$1.$2')
     .replace(/(\d{3})(\d)/, '$1.$2')
     .replace(/(\d{3})(\d)/, '$1-$2');
```
Display as `000.000.000-00`. When showing CPF of other users in the app, **mask** as `123.***.***-45`.

**MFA Code Input:**
- 6 separate digit boxes OR a single text input with letter-spacing + monospace and a max length of 6. The HTML uses the single-input pattern with `inputmode="numeric"` and large mono digits (~28px). Auto-advance to submit on the 6th digit.

---

### 2. Família (`/familia`) — Owner-only

> File: `screens/Família.html`

Uses a **secondary settings sidebar** (`w-[220px]`) to the right of the rail. The active link is "Família" under the "Workspace" group with a member-count pill (`4`).

**Page header**
- h1 "Família" (24px, 500, `-0.02em`).
- Top-right pill "Você é o owner" with brand dot.
- Subtitle: "Cada titular tem sua própria estratégia, posição consolidada e regra de liquidez. Membros pendentes começam a aparecer no dashboard assim que aceitam o convite."

**Section 1: Members list**
- Card with `rounded-xl border bg-[var(--color-bg-2)]`. Rows separated by `border-top: 1px solid var(--color-line-2)`.
- Each `HolderRow`:
  - 36×36 round avatar with first letter of nickname. Background colors per member (preserve exact OKLCH values from the HTML):
    - Rodrigo: `oklch(0.78 0.13 277)` (violet)
    - Grasi: `oklch(0.74 0.15 340)` (rose)
    - Amora: `oklch(0.78 0.15 60)` (amber)
    - Benicio: `oklch(0.74 0.14 160)` (teal)
  - Row content: nickname (14px, 500) + full name (12.5px, muted) + status pill.
  - Status pills:
    - **owner** — brand color (blue-violet)
    - **membro** — gain/green
    - **pendente** — warn/amber
    - Optional secondary pill "menor" (plain) for minors.
  - Sub-line (11.5px, muted): masked CPF in mono + age + risk profile + portfolio value (or "aguardando confirmação parental" for pending minors).
  - Right-side ⋯ menu button.

**Section 2: Add member form (inline card, not modal)**
- Card with `border` + subtle inset shadow.
- Layout:
  - 2-col grid: CPF input (with mask) | Ano de nascimento (4-char numeric).
  - Full-width "Nome completo".
  - Full-width "Apelido" with hint "aparece no dashboard e nas notificações".
  - Checkbox "Menor de idade" + descriptive text "Rodrigo será registrado como responsável e a estratégia exigirá horizonte de longo prazo. Saiba mais".
  - Footer row with `border-top` and negative margin trick: primary "Adicionar membro" + ghost "Cancelar" + right-aligned `⌘ ↵ envia` hint.
- Error state above the form: red bordered block (`.err-block`) with triangle-bang icon, headline, body, and a close button.

**Footer**
- "Plano Família — 4 / 6 titulares ativos. Comparar planos" + sync timestamp in mono.

---

### 3. Alertas (`/alerts`)

> File: `screens/Alertas.html`

Content max width `860px`.

**Page header**
- h1 "Alertas" + a pill showing unread count (`3` in critical-red) + caption "não lidos".
- Right side: "Marcar todos como lidos" + "Histórico" ghost buttons.
- Subtitle explaining what alerts represent + a link to Estratégia.

**Filter row (sticky under topbar, `top-12`)**
- Pill-shaped chip buttons (`.chip`): All / Info / Warning / Critical, each with a colored dot and a small mono count badge (`.count`).
- A vertical divider, then two dropdown triggers (`.dd-trigger`): "Todos titulares" and "Mais recentes".
- Right side: checkbox "Mostrar descartados".
- Active chip: `bg-[var(--color-bg-3)]`, brighter text, slightly lighter border.

**Feed**
- Grouped by date (`Hoje, 17 mai`, `Ontem, 16 mai`, `14 mai`...) with an uppercase tracking-wide heading and a small "X novos" count on the right.
- Each group is a `rounded-xl` card containing alert rows separated by `border-bottom`.

**AlertCard**
- Grid: `4px sev-strip | 28px icon | 1fr content | auto chevron`.
- The 3-px-wide severity strip sits at the very left, full row height.
- The 28×28 icon tile uses `color-mix(... 15%, transparent)` for background and an inset `1px` ring at `30%` color.
- Title row: severity pill + h3 title (14px, 500, tight tracking).
- Meta row: small avatar inline (`size-3.5`) + nickname, then bullet-separated meta in `text-[11.5px] text-[var(--color-text-3)]` — relative time (`há 12 min`, `há 1 h`, `há 1 d`), rule name in mono (`liquidity.minimum`), optional `pill-ticker` for tickers (uppercase mono, e.g. `HGLG11`).
- Right side: a chevron that flips `down` (collapsed) / `up` (expanded). Use `<details>` + `<summary>` or a controlled component.
- **Unread indicator**: a 5×5 brand-colored dot 8px from the row's left edge, with a `0 0 0 3px` soft halo. Critical unread dots use the crit color **and** animate with `@keyframes pulse` (1.8s ease-in-out infinite).
- **Read state**: `opacity: 0.55` on the entire row, unread dot hidden.

**Expanded body**
- Padded `pl-[64px] pr-6 pb-5` (aligning with the icon column).
- Paragraph description with inline `.num` highlights.
- **Recommendation block (`.reco`)**: `bg-[oklch(0.165_0_0)]`, `border-left: 2px solid <brand 80%>`, brand-tinted "RECOMENDAÇÃO" eyebrow label, then the recommendation copy.
- Action row: `btn-primary` "Marcar como lido" + `btn-ghost` "Descartar" + `btn-ghost` "Abrir estratégia de Rodrigo →" + right-aligned ticker pill.

**Empty state** (build but not shown by default): centered "Nenhum alerta no momento" in muted text, no illustration.

**Footer**
- "Mostrando X de Y alertas · Ver descartados (5) · Configurar regras".

---

### 4. Estratégia (`/holders/[holderId]/strategy`)

> File: `screens/Estratégia.html`

Two-column layout: **VIEW mode** on the left, **EDIT mode** on the right. In production, these are the same page in two states — show them as side-by-side panels in this design only to communicate the diff. Implement a single page with a top-right "Editar" / "Salvar"+"Cancelar" toggle.

**Page header** (above the two-column area, full width up to `max-w-[1480px]`)
- Eyebrow "ESTRATÉGIA · RODRIGO" in uppercase muted.
- Row: 36px round avatar + h1 holder name + **RiskProfileBadge** pill.
- Subtitle with strategy start date, last revision, total patrimony under this policy.
- Right side: "Histórico (4)" link + "Validar" + "Exportar" ghost buttons.

**RiskProfileBadge** (pill variant, also used as a segmented control in edit mode):
- `conservative` — `--color-cons` (blue), shield icon, label "Conservador"
- `moderate` — `--color-mod` (teal), balance/bars icon, label "Moderado"
- `aggressive` — `--color-aggr` (amber), flame icon, label "Arrojado"
- Background: `color-mix(in oklch, var(--color-X) 14%, var(--color-bg))`, border at 35% mix.

**VIEW mode card**
- Mode label (`.mode-label.mode-view`) at the top + "Editar" ghost button.
- 2×2 grid of info cards inside one card surface (separated by 1px lines, no gaps):
  - **Objetivo** — multiline text (~3 lines)
  - **Horizonte** — big mono number (24px, 500) + unit "anos" + caption
  - **Liquidez mínima** — big number + "%" + right-aligned status pill (`atual 3,2%` in red when below threshold)
  - **Threshold de desvio** — big "±3" + "pp" + caption
- **Allocation table** (`.alloc-table`):
  - Columns: Classe | Meta | Tol. | Atual.
  - Each row in the Classe column shows: 22×22 colored asset icon (mono, 2-char label), class name (500), small description in muted, and a horizontal progress bar below spanning the cell width.
  - **Progress bar (`.bar`)**: 6px tall, rounded, dark background; three layers:
    - `.fill` — solid meta-color at 45% opacity, width = meta %.
    - `.tol` — tinted band at meta±tolerance, left/right dashed borders.
    - `.actual` — 2px vertical bar at the actual %, white, with a `0 0 0 2px` cutout against card bg.
  - Meta colors: stocks BR `oklch(0.78 0.13 240)`, intl `60`, fixed income `150`, FIIs `30`, ETFs `300`, liquidity `200`.
  - Atual cell turns amber/red when deviating; show ▲/▼ next to the number.
- Total row at the bottom of the table — `100%` in green (`.sum-ok`) when valid.
- **Restricted assets** — section below, `info-label` "Ativos restritos" + tag chips (`.tag` — small `font-mono` chips, dark surface, subtle border) listing categories like `crypto`, `derivativos`, `microcaps`, `FIDC`.

**EDIT mode card**
- Mode label (`.mode-edit`, brand-tinted) + "3 alterações não salvas" + Cancelar + primary Salvar buttons.
- Card has a brand-colored ring: `box-shadow: 0 0 0 1px color-mix(in oklch, var(--color-brand) 28%, transparent), 0 8px 24px -12px oklch(0 0 0 / 0.5)`.
- **Risk profile** at top — segmented 3-button row using the risk pills. Non-selected at `opacity: 0.55`. Selected gets `box-shadow: 0 0 0 2px <50% mix>`.
- 2×2 grid of input cards replacing the info cards. Use `<textarea>` for the objective; numeric inputs with suffix overlays for horizon/liquidity/threshold. Inline warning text under inputs for soft validation (e.g. liquidity input shows "⚠ Carteira atual está em 3,2% — gerará alerta crítico ao salvar.").
- **Editable allocation table** — same layout but `Meta` and `Tol` cells are `.num-input` (64×28, mono, right-aligned). Trailing column has a trash icon to delete a row. Changed rows get a subtle brand tint on the input background: `background: color-mix(in oklch, var(--color-brand) 10%, oklch(0.155 0 0))`.
- "Adicionar classe" inline button (text link with plus icon) above the table.
- **Total row with live validation**:
  - When sum = 100: total in `.sum-ok` (gain).
  - When ≠ 100: total in `.sum-bad` (loss) + a pill on the right showing the delta (`+1pp` / `-2pp`).
- **Inline validation banner** below total: loss-tinted block with triangle icon. Copy: "Soma deve totalizar exatamente 100%. Atual: 101% — ajuste uma das classes em -1pp ou clique em **balancear automaticamente**."
- **Restricted assets (edit)**: removable tag chips (`.tag.removable` — `×` on the right) + inline `<input>` with placeholder "adicionar..." to add new.
- Footer row inside card: checkbox "Notificar Grasi sobre mudanças" + "Próxima revisão: jun/2026".

**Diff strip** below both panels — 4 small cards summarizing the staged changes (`32% → 30%`, etc) with old value `line-through`, an arrow, the new value, and a colored delta pill.

**Validation rules:**
- Allocation `meta` must sum to exactly 100%.
- Each `tolerance` must be ≥ 1.
- `horizon` must be ≥ 1 year (recommended 7+ for `aggressive`).
- `liquidity` cannot exceed 50%.
- All numeric inputs accept integers only.

---

### 5. Importar CSV (`/import`)

> File: `screens/Importar CSV.html`

The HTML shows two wizard states side-by-side (Step 3 and Step 4) for review; **in production this is a single wizard** that advances through 4 steps.

**Page header**
- h1 "Importar portfólio" + subtitle.
- Right side: "Ver histórico" anchor link + "Template CSV" ghost button.

**Wizard frame (`.wizard`)** — single card, `rounded-2xl border`, with a brighter shadow.

**Horizontal stepper (`.stepper`)** — 4-column grid at the top of the wizard.
- Each step: 22px circle (mono digit OR checkmark when completed) + bold label + sub-caption with current value (`"Rodrigo"`, `"XP Investimentos"`, `"posicao-mai-26.csv"`, `"23 posições"`).
- Connector line between circles, `1px` `var(--color-line)`; turns brand-colored when the prior step is completed.
- Active step circle: brand fill + white digit + a `0 0 0 4px <22% mix>` halo. Active label `font-weight: 600`.

**Body content area** — padded `p-6`, content cap `max-w-[560px]` (the wizard itself is wider — content is centered).

**Footer navigation (`.nav-foot`)** — sits at the wizard's bottom: "Voltar" ghost (with left-chevron) on the left, step count `Passo X de 4` text, "Salvar rascunho" + primary "Continuar" / "Importar X posições" on the right.

#### Step 1 — Holder selection
- 2-column grid of `HolderCard`s: each card 96px tall, with the 36px avatar + nickname + "Rodrigo Tazima" subtitle + role pill (owner/membro).
- Selected: brand border + `color-mix(in oklch, var(--color-brand) 10%, transparent)` background tint.
- Not in the demo HTML but build per the prompt.

#### Step 2 — Institution
- 3 large `InstitutionCard`s in a row: **XP**, **BTG**, **Nomad**.
- Each card has a 36×36 mono-glyph square (XP amber, BTG amber-ish, NM blue), name, and one-line description (e.g. "Renda variável BR · home broker").
- Selected: brand border + tint, same as holder cards.

#### Step 3 — File upload (`FileDropzone`)
- States:
  - **idle** — `.dropzone` (dashed 1.5px brand border at 55% mix, brand-tinted background at 6%). Centered upload-cloud icon, headline "Arraste o CSV aqui ou clique para selecionar", caption ".csv até 10 MB".
  - **dragover** — solid brand border, brighter background tint.
  - **uploading** — file name + progress bar (1px tall, brand-filled).
  - **success** (`.dropzone.success`) — gain-colored border + 7% gain background. Shows a 40px round green check, file name (`posicao-rodrigo-mai-26.csv`, 14.5px 500), and meta row "184 KB · 23 linhas · UTF-8 · separador `,`". A 100% gain-colored progress bar below confirms validation. Bottom row: "Pré-visualizar" + "Trocar arquivo" buttons.
  - **error** — loss border + loss-tinted background, error text below the headline.
- **Context strip** above the dropzone — small pills/chips showing the choices from Steps 1 & 2 ("Rodrigo" + "XP Investimentos") so the user keeps context.
- **Detected hint** below the dropzone — a brand-tinted info banner: "Formato XP reconhecido. Detectamos 23 posições, 2 movimentações novas vs. importação anterior (06/05) e 1 ticker desconhecido — vamos resolver no passo 4."

#### Step 4 — Review & confirm
- **ExchangeRateInput** (Nomad only — show conditionally when `institution === 'NOMAD'`):
  - Rounded card with a brand-tinted border and small "currency swap" icon.
  - Heading "Cotação USD/BRL" + 2-line explanation.
  - 3-column row: `[Cotação USD → BRL] [arrow icon] [Referência (somente leitura)]`.
    - Editable input: mono, prefix `R$` (absolute-positioned left, 32px padding), suffix `/ USD` (right). Default placeholder `5,87`. Accept comma or dot.
    - Reference input: shows last PTAX with date + a small Δ% vs entered rate.
  - Footnote: "A Nomad não fornece câmbio nos extratos; usamos a cotação manual informada para evitar saltos artificiais no patrimônio entre importações."
- **Preview table** (`.preview-table`):
  - Sticky header. Columns: Ticker (mono) | Nome | Qtd (right, num) | Preço USD (right, num) | Total R$ (right, num).
  - Max height ~260px, scrollable.
  - **Error rows**: `bg-[color-mix(in oklch, var(--color-loss) 7%, transparent)]` + `box-shadow: inset 2px 0 0 var(--color-loss)` on the first cell. Show "linha N" + "ticker em branco" reason in the offending cells; replace the total cell with a "resolver" inline button.
  - Header summary chip strip on the right: `pill-ok "6 ok"` + `pill-err "1 erro"`.
- **Summary row below** the table:
  - Left: "6 linhas serão importadas · 1 ignorada · total estimado R$ 286.672,65".
  - Right: checkbox "Substituir posições existentes" (default checked).
- Primary footer button shows a count: "Importar 6 posições".

#### Import History (below the wizard)
- Section heading "Histórico de importações" + "últimos 30 dias" + "Exportar log".
- Table `.hist-table` with columns: Titular | Instituição | Data (mono) | Status pill | Linhas (right) | Erros (right) | Ação link.
- Status pills:
  - **concluído** — `pill-ok` with green dot
  - **falhou** — `pill-err` with red dot
  - **processando** — `pill-warn` with the spinner (`.spinner` — 12px, 1.5px border, warn color, 0.9s rotation)
- Action link text varies by status: "acompanhar" (processing), "corrigir" (failed), "ver detalhes" (completed).

---

## Interactions & Behavior

### Animations

- Severity pulsing dot (critical alerts unread): `@keyframes pulse` — 1.8s ease-in-out infinite, animates the box-shadow halo from 3px → 6px and back.
- Sidebar alert badge: `@keyframes badge-pulse` — 2s ease-in-out infinite, double-ring shadow that breathes between 4px and 8px outer spread.
- Spinner (history "processando" status): `@keyframes spin` — 0.9s linear infinite, 360° rotate.
- Button active state: `transform: translateY(0.5px)` for primary buttons.
- All hover/focus transitions: `0.15s ease` on `background`, `color`, `border-color`, `box-shadow`.

### Focus states

- Inputs on focus: brand border + `0 0 0 3px <22% brand mix>` outer ring + slightly lifted background.
- Buttons: rely on native focus-visible (the codebase's shadcn ring).

### Navigation flows

- **Auth**: login → magic-link email → `/onboarding` (first time) → `/mfa/enroll` → `/mfa/verify` → app dashboard. Returning users skip onboarding/MFA-enroll and go login → MFA verify → dashboard.
- **Família**: owner-only — gate with `requireRole('OWNER')` on the route.
- **Alertas**: clicking a row's chevron expands inline (no navigation). "Abrir estratégia de Rodrigo" navigates to `/holders/[id]/strategy`.
- **Estratégia**: "Editar" toggles edit mode. "Salvar" validates → POST → optimistic update → toast. "Cancelar" discards changes (confirm if dirty).
- **Importar CSV**: linear wizard. Step state lives in URL or React state; "Voltar" preserves entered values. On final submit, navigate to a result page or back to dashboard with a success toast.

### Form validation (inline)

| Field | Rule | Trigger |
|---|---|---|
| Email | RFC-ish + non-empty | onBlur |
| CPF | 11 digits, valid checksum, unique per family | onBlur + server-side |
| Birth year | 4 digits, 1900–current year | onBlur |
| Nickname | 1–24 chars | onChange |
| TOTP code | exactly 6 digits | auto-submit on 6 |
| Allocation row | 0 ≤ meta ≤ 100, integer | onChange |
| Allocation totals | sum === 100 | live, debounced 100ms |
| Liquidity min | 0 ≤ x ≤ 50 | onBlur |
| Exchange rate | > 0, decimal accepted (`,` or `.`) | onBlur |
| File upload | `.csv`, ≤ 10MB | on drop/select |

Validation surfaces inline below the field with `text-[12px] text-[var(--color-loss)] mt-1`. Form-level errors render in `.err-block` (red triangle icon + headline + body + close).

### Empty states

- Alertas: centered text "Nenhum alerta no momento" in `text-[var(--color-text-3)]`. No illustration.
- Família list when only owner exists: keep the row, replace add form headline to encourage adding the first member.
- Import history: "Nenhuma importação ainda" + ghost button "Importar primeiro extrato".

### Loading states

- Primary buttons: replace label with a spinner (12px, white). Disable.
- Async data: skeleton rows in tables (use shadcn `Skeleton`).
- Upload progress: progress bar inside the dropzone.

---

## State Management

Suggested data shape (TypeScript):

```ts
type Severity = 'info' | 'warning' | 'critical';
type AlertStatus = 'unread' | 'read' | 'dismissed';
type RiskProfile = 'conservative' | 'moderate' | 'aggressive';
type HolderRole = 'owner' | 'member' | 'pending';
type Institution = 'XP' | 'BTG' | 'NOMAD';
type ImportStatus = 'processing' | 'completed' | 'failed';

interface Holder {
  id: string;
  nickname: string;       // "Rodrigo"
  fullName: string;       // "Rodrigo Tazima"
  cpf: string;            // unmasked, stored encrypted
  cpfMasked: string;      // "123.***.***-45"
  birthYear: number;
  role: HolderRole;
  isMinor: boolean;
  riskProfile: RiskProfile;
  avatarHue: number;      // OKLCH hue for the avatar bg
  portfolioBRL: number | null;  // null when pending
}

interface Alert {
  id: string;
  severity: Severity;
  status: AlertStatus;
  title: string;
  description: string;
  recommendation?: string;
  holderId: string;
  ticker?: string;
  rule: string;           // e.g. 'liquidity.minimum'
  generatedAt: string;    // ISO
}

interface Strategy {
  holderId: string;
  riskProfile: RiskProfile;
  goal: string;
  horizonYears: number;
  liquidityMinPct: number;
  deviationThresholdPP: number;
  allocations: Array<{
    assetClass: string;  // 'EQUITY_BR' | 'EQUITY_INTL' | 'FIXED_INCOME' | 'FIIS' | 'ETF' | 'FUNDS' | 'LIQUIDITY' | ...
    targetPct: number;
    tolerancePP: number;
    currentPct: number;  // computed from positions
  }>;
  restrictedAssets: string[];
  updatedAt: string;
  notifyMembers: string[];  // holder IDs
}

interface ImportJob {
  id: string;
  holderId: string;
  institution: Institution;
  filename: string;
  uploadedAt: string;
  status: ImportStatus;
  rowsTotal: number;
  rowsImported: number;
  rowsErrors: number;
  exchangeRate?: number;  // only for Nomad
}
```

Use **React Query** (or whatever the codebase has) for server state. Local UI state (wizard step, edit-mode flag, expand/collapse) is React state.

---

## Assets

- **Fonts**: Geist + Geist Mono via Google Fonts. The HTML uses the Google CDN; in production prefer `next/font/google` for self-hosting.
- **Icons**: All inline SVG, 12–16px, `stroke-width: 1.3–1.4`. Replace with **lucide-react** (the shadcn default) — closest matches:
  - Dashboard rail icon → `LayoutGrid`
  - Alertas → `Bell`
  - Estratégia → `Target`
  - Importar → `Upload`
  - Família → `Users`
  - Search → `Search`
  - Edit → `Pencil`
  - Trash → `Trash2`
  - Check / completed → `Check` / `CheckCircle2`
  - Chevrons → `ChevronRight`, `ChevronDown`, `ChevronUp`, `ChevronLeft`
  - Info → `Info`
  - Warning triangle → `AlertTriangle`
  - Critical → `AlertOctagon` or `AlertCircle`
  - Clock → `Clock`
  - Upload cloud → `UploadCloud`
  - Trending → `TrendingUp`
- **Brand logo**: the zigzag mark inside a white rounded-md tile (`size-8`, `rounded-md`). SVG is in every HTML file — copy the path.
- **QR code**: use `qrcode.react` for MFA enroll.
- **No photos**: avatars are always letter + colored background (financial-privacy decision).

---

## CPF Privacy Rules

- Store the full CPF encrypted at rest.
- **Display** the masked form `123.***.***-45` everywhere in the app, including to the owner in the Família list.
- Only the **owner** can reveal full CPFs, and only inside the audit log section of account settings.
- CPF input always uses the typing mask (`000.000.000-00`).

---

## Files

The HTML design references are in `screens/`:

- `screens/Auth Flow.html` — 5 auth screens
- `screens/Família.html` — family management
- `screens/Alertas.html` — alerts feed
- `screens/Estratégia.html` — strategy editor (view + edit shown side by side)
- `screens/Importar CSV.html` — CSV wizard (Step 3 + Step 4 shown side by side) + history table
- `screens/Dashboard.html` — bonus dashboard reference (not in the requested scope but shares the same system)

Open them in a browser at 1440–1640px viewport to inspect spacing and interactions. They are all dark-mode-only.

---

## Build order (recommendation)

1. **Tokens & globals** — add the OKLCH variables, configure Tailwind, install Geist via `next/font`.
2. **Primitives** — `Button` variants (primary/ghost/bare/sm), `Input`, `Pill` (with status variants), `Avatar`, `Chip`, `KbdHint`, `IconTile`.
3. **App shell** — left rail + topbar + breadcrumbs + ⌘K search trigger.
4. **Auth flow** — simplest, no app shell dependencies.
5. **Família** — settings sub-nav + holder list + add-member form.
6. **Alertas** — feed with filters; the most state-light of the app screens.
7. **Estratégia** — most complex (view/edit + allocation bars + live validation).
8. **Importar CSV** — wizard machine + dropzone + preview + history.

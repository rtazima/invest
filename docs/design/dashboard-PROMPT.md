# Design PROMPT — Dashboard principal

> Extraído do Claude Design export (`Invest Dashboard.html`)
> Data: 2026-05-11
> Este arquivo é a fonte de verdade para implementação da tela de dashboard.
> O comando `/implement` usa este arquivo como contexto de UI.
>
> Regra de conflito: PRD > CLAUDE.md > este PROMPT.md

---

## Tokens de design (`globals.css` / Tailwind @theme)

```css
@theme {
  /* Tipografia */
  --font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, "JetBrains Mono", monospace;

  /* Neutros — OKLCH chroma zero (true neutral, sem cast de cor) */
  --color-bg:       oklch(0.145 0 0);   /* base da página */
  --color-bg-2:     oklch(0.175 0 0);   /* surface / cards */
  --color-bg-3:     oklch(0.208 0 0);   /* elevated / row hover / toggle ativo */
  --color-line:     oklch(0.272 0 0);   /* bordas normais */
  --color-line-2:   oklch(0.235 0 0);   /* bordas sutis */
  --color-text:     oklch(0.985 0 0);   /* texto primário */
  --color-text-2:   oklch(0.708 0 0);   /* texto secundário */
  --color-text-3:   oklch(0.556 0 0);   /* texto terciário / labels */

  /* Semânticas — chroma ~0.16, hue rotacionado */
  --color-gain:      oklch(0.76 0.16 152);   /* verde (P&L positivo) */
  --color-gain-soft: oklch(0.42 0.09 152);   /* verde suave (bg tintado) */
  --color-loss:      oklch(0.68 0.20 24);    /* vermelho (P&L negativo) */
  --color-loss-soft: oklch(0.40 0.13 24);    /* vermelho suave */
  --color-warn:      oklch(0.80 0.15 82);    /* âmbar (warning) */
  --color-info:      oklch(0.74 0.13 232);   /* azul (info) */
  --color-crit:      oklch(0.65 0.23 22);    /* vermelho escuro (critical) */
}
```

### Classes utilitárias globais

```css
/* Números financeiros — sempre aplicar em colunas numéricas */
.num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

/* Separador hairline (bottom border sutil) */
.hairline {
  box-shadow: inset 0 -1px 0 var(--color-line-2);
}

/* Severidade de alertas */
.sev-info {
  background: color-mix(in oklch, var(--color-info) 12%, transparent);
  border-color: color-mix(in oklch, var(--color-info) 35%, var(--color-line));
}
.sev-warn {
  background: color-mix(in oklch, var(--color-warn) 12%, transparent);
  border-color: color-mix(in oklch, var(--color-warn) 35%, var(--color-line));
}
.sev-crit {
  background: color-mix(in oklch, var(--color-crit) 14%, transparent);
  border-color: color-mix(in oklch, var(--color-crit) 45%, var(--color-line));
  box-shadow: inset 3px 0 0 var(--color-crit);
}

/* Scrollbar */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: oklch(0.3 0 0); border-radius: 8px; border: 2px solid var(--color-bg); }
::-webkit-scrollbar-track { background: transparent; }
```

---

## Layout geral

```
┌────────────────────────────────────────────────────┐
│ Sidebar 56px (fixed, left)                         │
├────────────────────────────────────────────────────┤
│ pl-14 (main area, 100vw - 56px)                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ Header (h-12, sticky, hairline, blur)        │  │
│  ├──────────────────────────────────────────────┤  │
│  │ Main (px-6 py-6, max-w-[1440px])             │  │
│  │  Hero section (grid 12 cols, gap-4, mb-6)    │  │
│  │  Tabs + table section                        │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

---

## Sidebar (`<aside>`)

```tsx
// fixed inset-y-0 left-0 w-14
// border-r border-[var(--color-line-2)] bg-[var(--color-bg)]
// flex flex-col items-center py-3 z-20

// Logo: size-8 rounded-md bg-[var(--color-text)] text-[var(--color-bg)]
//       grid place-items-center font-semibold text-[14px] mb-4
//       SVG: gráfico de linha ascendente (14×14)

// Nav links: size-9 grid place-items-center rounded-md
//   Ativo:   bg-[var(--color-bg-3)] text-[var(--color-text)]
//   Inativo: text-[var(--color-text-3)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-2)]

// Itens de nav (ícones 16×16 stroke):
//   Dashboard  → grade de 4 retângulos
//   Alertas    → sino + badge vermelho (size-1.5 rounded-full bg-[var(--color-crit)])
//   Estratégia → alvo/target circular
//   Importar   → seta download
//   Config     → engrenagem

// Avatar (bottom): size-7 rounded-full gradient zinc-600→zinc-800
//   text-[10.5px] font-semibold ring-1 ring-[var(--color-line)]
//   Iniciais: "RT"
```

---

## Header (`<header>`)

```tsx
// h-12 flex items-center px-6 hairline sticky top-0 z-10
// bg-[var(--color-bg)]/95 backdrop-blur

// Esquerda: breadcrumb
//   "Família Tazima" (text-[var(--color-text-3)]) › "Dashboard" (font-medium)
//   Separador: chevron right SVG 12×12

// Direita: flex items-center gap-2
//   Status de sync por instituição (text-[11.5px] text-[var(--color-text-2)]):
//     • dot size-1.5 rounded-full bg-[var(--color-gain)] + "XP"
//     • dot size-1.5 rounded-full bg-[var(--color-gain)] + "BTG"
//     • dot size-1.5 rounded-full bg-[var(--color-warn)] + "Nomad" (warn = expirado)
//     + "· atualizado 14:03" (text-[var(--color-text-3)] num)
//   Botão "Sync" (ghost, ícone refresh 13×13)
//   Botão "Buscar" (primário ghost, ícone lupa + ⌘K kbd)
```

### Botões (padrões reutilizáveis)

```tsx
// .btn (base)
// inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px]
// font-medium transition-colors

// .btn (primário)
// bg-[var(--color-bg-3)] text-[var(--color-text)]
// hover:bg-[var(--color-line)] border border-[var(--color-line)]

// .btn-ghost
// text-[var(--color-text-2)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-2)]

// .kbd
// text-[10px] px-1 py-0.5 rounded bg-[var(--color-bg-3)]
// border border-[var(--color-line)] text-[var(--color-text-3)] num
```

---

## Hero section (`grid grid-cols-12 gap-4 mb-6`)

### Card patrimônio total (`col-span-7`)

```tsx
// rounded-lg border border-[var(--color-line-2)] bg-[var(--color-bg-2)] p-5

// Header do card:
//   Label: text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-3)] — "PATRIMÔNIO TOTAL"
//   Pill: inline badge "4 titulares · 3 instituições"
//   Period switcher (top right): 1D 1S 1M [6M] 1A MAX
//     border border-[var(--color-line)] rounded-md p-0.5 text-[11.5px]
//     Ativo: bg-[var(--color-bg-3)] text-[var(--color-text)]
//     Inativo: text-[var(--color-text-3)]

// Valor principal:
//   "R$" text-[var(--color-text-3)] text-[14px] num (prefixo)
//   "1.183.420" num text-[44px] leading-none font-medium tracking-[-0.02em]
//   ",57" text-[var(--color-text-3)] (centavos em opacidade menor)

// Sub-linha de performance (text-[12.5px]):
//   Hoje · +R$ 4.812,30 · +0,41%
//   separador h-3 w-px bg-[var(--color-line)]
//   30d · +R$ 28.140,12 · +2,43%
//   separador
//   12m · +11,82% · vs CDI 10,4% (text-[var(--color-text-3)])

// Gráfico de linha (SVG viewBox="0 0 720 170", w-full h-[170px], preserveAspectRatio="none"):
//   Grid de fundo: pattern 60×34, stroke oklch(0.235 0 0)
//   Linha benchmark (CDI): stroke oklch(0.5 0 0), stroke-dasharray="3 3", stroke-width=1
//   Fill gradient: var(--color-gain) 0.24→0 opacity, id="hero-fill"
//   Linha principal: stroke oklch(0.76 0.16 152), stroke-width=1.6, fill=none
//   Dot final: r=3 fill gain + r=6 fill gain opacity 0.25 (halo)
//   Crosshair de hover: linha vertical dashed oklch(0.4 0 0) + dot branco r=3
//   Labels de eixo X: text-[10.5px] text-[var(--color-text-3)] num (meses)
```

### .pill (badge reutilizável)

```tsx
// inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
// text-[10.5px] text-[var(--color-text-3)]
// bg-[var(--color-bg-3)] border border-[var(--color-line-2)]

// .dot dentro de pill:
// size-1.5 rounded-full bg-[var(--color-gain)] (verde = ativo/ok)
```

### Cards de titular (`col-span-5 grid grid-cols-2 gap-4`)

Cada card (`rounded-lg border border-[var(--color-line-2)] bg-[var(--color-bg-2)] p-4`):

```tsx
// Header:
//   Avatar: size-5 rounded-full bg-[cor do titular] text-[10px] grid place-items-center font-medium
//   Nome: text-[12.5px] font-medium
//   Perfil: text-[10.5px] text-[var(--color-text-3)]

// Patrimônio: num text-[20px] tracking-tight
//   Centavos em text-[var(--color-text-3)] text-[14px]

// Sub-linha: text-[11px] num flex items-center gap-2
//   Hoje: cor gain/loss
//   Meta: text-[var(--color-text-3)] (ex: "17% / R$12k/mês 18a")

// Sparkline SVG (mt-auto, -mx-4 -mb-4):
//   viewBox relativo, h-[40px]
//   .spark path: stroke var(--color-gain), stroke-width 1.25
//   .spark .fill: fill color-mix(gain 14%, transparent)

// Cores por titular (aplicar no avatar e na sparkline):
//   Rodrigo: oklch(0.65 0.10 240)  — azul
//   Grasi:   oklch(0.68 0.13 330)  — rosa/magenta
//   Amora:   oklch(0.72 0.15 60)   — laranja/âmbar
//   Benicio: oklch(0.70 0.13 160)  — verde-azulado
```

---

## Seção de tabs

### Tablist

```tsx
// div: border-b border-[var(--color-line-2)] flex items-center gap-0 mb-0

// .tab:
//   relative px-4 py-2.5 text-[13px] text-[var(--color-text-3)]
//   hover:text-[var(--color-text)] transition-colors cursor-pointer

// .tab[aria-selected="true"]:
//   color: var(--color-text)
//   ::after { left:0; right:0; bottom:-1px; height:1.5px; background:var(--color-text); }

// Tabs: Global (G) | Por Titular (T) | Por Instituição (I) | Por Classe (C)
// Keyboard shortcuts: G/T/I/C

// Sub-header da tabela (sticky abaixo das tabs):
//   text-[11.5px] text-[var(--color-text-3)] num — "42 ativos · ordenado por valor"
//   Botões de filtro à direita (classe, instituição, titular)
```

---

## Tabela de posições (tab Global)

### Estrutura da tabela

```tsx
// table w-full text-[12.5px]

// thead: hairline text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-3)]
//   th: py-2 px-2 text-right (colunas numéricas) ou text-left (texto)
//   Primeira th: pl-4  |  Última th: pr-4

// tbody:
//   tr: hover:bg-[var(--color-bg-3)] hairline transition-colors cursor-pointer
//   td: py-2 px-2
```

### Colunas

| Coluna | Classe | Alinhamento | Notas |
|---|---|---|---|
| Ativo (ticker + classe tag) | `num font-medium` | left | pill de classe ao lado |
| Titular | avatar circular + nome | left | cor do titular |
| Instituição | `text-[var(--color-text-2)]` | left | XP / BTG / Nomad |
| Qtd | `num` | right | |
| Preço Médio | `num text-[var(--color-text-2)]` | right | |
| Preço Atual | `num` | right | |
| Valor de Mercado | `num` | right | se USD: `<span text-[10.5px] text-[var(--color-text-3)]> USD</span>` |
| P&L | `num` classe gain/loss | right | sinal + valor absoluto |
| P&L % | `num` classe gain/loss | right | sinal + % |
| % Port. | `num text-[var(--color-text-2)]` | right | |

### Tags de classe de ativo (`.pill` dentro de célula)

```
RF  → "Renda Fixa"
RV  → "Renda Var."
FII → "FII"
Int → "Internac."
```

### Helpers de formatação (TypeScript)

```typescript
// Gain/loss
const gainCls = (n: number) => n >= 0 ? 'text-[var(--color-gain)]' : 'text-[var(--color-loss)]'
const sign    = (n: number) => n >= 0 ? '+' : '−'   // usar '−' (U+2212), não '-'
const abs     = (n: number) => Math.abs(n)

// Formato pt-BR
const fmt  = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt0 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
```

---

## Tab Por Titular

```tsx
// table w-full text-[12.5px]
// Colunas: Titular | Perfil | Instituições | Patrimônio | Hoje% | 30d% | 12m% | Meta | % Port.

// Titular cell:
//   size-6 rounded-full grid place-items-center text-[11px] font-medium (cor do titular)
//   + nome font-medium

// Meta cell: text-[11.5px] text-[var(--color-text-2)] num
//   Ex: "82% / 100%" (Rodrigo) | "liq. 30d ok" (Grasi) | "17% / R$12k/mês 18a" (Amora)
```

---

## Tab Por Instituição

```tsx
// Colunas: Instituição | Tipo | Sync | Contas | Ativos | Patrimônio | Hoje% | 12m% | % Port.

// Status dot: size-1.5 rounded-full
//   ok   → bg-[var(--color-gain)]
//   warn → bg-[var(--color-warn)]

// Sync cell: num text-[11.5px]
//   ok:   text-[var(--color-text-2)]  → "14:03 · ok"
//   warn: text-[var(--color-warn)]    → "11/05 23:14 · expirado"
```

---

## Tab Por Classe de Ativo

```tsx
// Colunas: Classe | Sub-ativos | Qtd Ativos | Patrimônio | Alvo% | Atual% | Desvio pp | 12m% | Barra

// Classe cell: size-2 rounded-sm (cor da classe) + nome

// Desvio (pp = pontos percentuais):
//   > 0: text-[var(--color-warn)]   (acima do alvo)
//   < 0: text-[var(--color-info)]   (abaixo do alvo)
//   = 0: text-[var(--color-text-2)]
//   Sinal: '+' ou '−', nunca '-'

// Barra de alocação (última coluna, w-32 ml-auto):
//   Container: h-1.5 w-32 bg-[var(--color-bg-3)] rounded-full overflow-hidden
//   Fill: inset-y-0 left-0, width = atual%, background = cor da classe
//   Marcador de alvo: absolute inset-y-[-2px] w-px bg-[var(--color-text)] left = alvo%

// Cores por classe:
//   Renda Fixa:     oklch(0.74 0.13 232)   — azul
//   Renda Variável: oklch(0.76 0.16 152)   — verde
//   Fundos Imob.:   oklch(0.80 0.15 82)    — âmbar
//   Internacional:  oklch(0.68 0.18 300)   — roxo
//   Liquidez:       oklch(0.55 0.04 240)   — cinza-azulado
//   Outros:         oklch(0.45 0.02 240)   — cinza escuro
```

---

## Donut de alocação (SVG)

```tsx
// SVG viewBox="-80 -80 160 160" (coordenadas centradas)
// Círculo de fundo: r=54, fill=none, stroke=var(--color-line), stroke-width=18
// Segmentos: r=54, fill=none, stroke-width=18
//   stroke-dasharray: [comprimento_arco, resto_circunferencia]
//   Circunferência = 2π × 54 ≈ 339.3
//   Rotação de cada segmento via stroke-dashoffset + rotate

// .ring-seg: transition stroke-width .15s ease, opacity .15s ease
// .ring-seg:hover: stroke-width: 26

// Legenda (ao lado do donut):
//   ul sem bullets, cada li: flex items-center gap-2 text-[11.5px]
//   size-2 rounded-sm (cor da classe) + nome + num valor
```

---

## Painel de alertas (aside direito, fixo)

```tsx
// fixed right-0 top-12 bottom-0 w-64
// border-l border-[var(--color-line-2)] bg-[var(--color-bg)] overflow-y-auto

// Header: p-4 hairline flex items-center justify-between
//   "Alertas" text-[12px] font-medium
//   Badge count: size-4 rounded text-[10px] bg-[var(--color-crit)] num

// Alert card: p-3 flex flex-col gap-1 border-l-[2px] sev-{info|warn|crit}
//   text-[11.5px] font-medium (título)
//   text-[11px] text-[var(--color-text-2)] (descrição, 2 linhas máx)
//   text-[10.5px] text-[var(--color-text-3)] num (timestamp)
```

---

## Fontes — instalação

```bash
# Google Fonts no <head> (ou via next/font para produção)
# Geist: https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600
# Geist Mono: https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500

# Para Next.js App Router (recomendado):
import { Geist, Geist_Mono } from 'next/font/google'
const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })
```

---

## font-feature-settings

```css
body {
  font-family: var(--font-sans);
  font-feature-settings: "ss01", "cv11", "cv02";
}
/* ss01 = alternativas estilísticas Geist */
/* cv11/cv02 = variantes de caracteres para legibilidade financeira */
```

---

## Dados de exemplo (para seed / fixtures de testes)

### Posições

```typescript
const positions = [
  { tk:'Tesouro IPCA+ 2035',  cls:'RF',  titular:'Rodrigo', inst:'BTG',   qtd:187,  pm:1000.00, atual:1004.21, val:187787.27, pl:787.27,   pct:0.42,  port:15.87 },
  { tk:'CDB BTG 105% CDI',    cls:'RF',  titular:'Rodrigo', inst:'BTG',   qtd:1,    pm:142000,  atual:142300,  val:142300.00, pl:2300.00,  pct:1.64,  port:12.02 },
  { tk:'Tesouro Selic 2029',  cls:'RF',  titular:'Grasi',   inst:'XP',    qtd:96,   pm:990.00,  atual:992.41,  val:95271.36,  pl:231.36,   pct:0.24,  port:8.05  },
  { tk:'VOO',                 cls:'Int', titular:'Rodrigo', inst:'Nomad', qtd:28,   pm:480.00,  atual:522.10,  val:74333.51,  pl:5985.81,  pct:8.77,  port:6.28, ccy:'USD' },
  { tk:'LCA Itaú 92% CDI',    cls:'RF',  titular:'Grasi',   inst:'XP',    qtd:1,    pm:78000,   atual:78420,   val:78420.00,  pl:420.00,   pct:0.54,  port:6.63  },
  { tk:'QQQ',                 cls:'Int', titular:'Rodrigo', inst:'Nomad', qtd:14,   pm:462.00,  atual:495.30,  val:35243.71,  pl:2370.81,  pct:7.21,  port:2.98, ccy:'USD' },
  { tk:'PETR4',               cls:'RV',  titular:'Rodrigo', inst:'XP',    qtd:800,  pm:38.20,   atual:41.85,   val:33480.00,  pl:2920.00,  pct:9.55,  port:2.83  },
  { tk:'BBAS3',               cls:'RV',  titular:'Rodrigo', inst:'XP',    qtd:1500, pm:27.50,   atual:32.10,   val:48150.00,  pl:6900.00,  pct:16.73, port:4.07  },
  { tk:'HGLG11',              cls:'FII', titular:'Rodrigo', inst:'XP',    qtd:200,  pm:162.00,  atual:168.40,  val:33680.00,  pl:1280.00,  pct:3.95,  port:2.85  },
  { tk:'VALE3',               cls:'RV',  titular:'Rodrigo', inst:'XP',    qtd:600,  pm:64.00,   atual:60.30,   val:36180.00,  pl:-2220.00, pct:-5.78, port:3.06  },
  { tk:'ITSA4',               cls:'RV',  titular:'Rodrigo', inst:'XP',    qtd:4000, pm:10.10,   atual:11.85,   val:47400.00,  pl:7000.00,  pct:17.33, port:4.01  },
  { tk:'IVVB11',              cls:'Int', titular:'Amora',   inst:'XP',    qtd:30,   pm:290.00,  atual:305.40,  val:9162.00,   pl:462.00,   pct:5.31,  port:0.77  },
]
```

### Totais por titular

```typescript
const byTitular = [
  { titular:'Rodrigo', perfil:'Arrojado',      inst:'XP · BTG · Nomad', patrim:687142.18, hoje:0.52,  d30:3.10, m12:14.20, color:'oklch(0.65 0.10 240)' },
  { titular:'Grasi',   perfil:'Conservador',   inst:'XP · BTG',         patrim:312480.00, hoje:0.18,  d30:1.40, m12:9.80,  color:'oklch(0.68 0.13 330)' },
  { titular:'Amora',   perfil:'Mod./Arrojado', inst:'XP',               patrim:124860.42, hoje:-0.12, d30:1.90, m12:11.40, color:'oklch(0.72 0.15 60)'  },
  { titular:'Benicio', perfil:'Arrojado',      inst:'XP',               patrim:58937.97,  hoje:0.28,  d30:2.20, m12:12.10, color:'oklch(0.70 0.13 160)' },
]
// Total: R$ 1.183.420,57
```

---

## Atalhos de teclado

```
G → tab Global
T → tab Por Titular
I → tab Por Instituição
C → tab Por Classe
⌘K → busca global
```

---

## Notas de implementação

1. **`class="num"`** deve ser aplicada em toda célula com valor numérico (quantidade, preço, valor, %). Não usar `tabular-nums` inline — usar sempre a classe `.num`.

2. **Sinal de menos**: usar `−` (U+2212 MINUS SIGN), nunca `-` (hífen) em valores negativos.

3. **Centavos em opacidade menor**: o padrão do design separa inteiros dos centavos com `text-[var(--color-text-3)]` para os centavos — aplicar em todos os valores grandes.

4. **`col-span-7` + `col-span-5`**: o hero usa grid de 12 colunas. O card de patrimônio ocupa 7, os 4 cards de titular ocupam 5 (em grid 2×2 interno).

5. **Sidebar fixa**: `pl-14` no wrapper principal para compensar os 56px da sidebar.

6. **Header sticky**: `sticky top-0 z-10 bg-[var(--color-bg)]/95 backdrop-blur` — leve transparência com blur quando rola a página.

7. **Dark mode como `<html class="dark">`**: o tema é sempre dark. Não implementar toggle por enquanto.

# LED Wall Designer

Professional 2D LED wall planning and configuration tool (Nuxt 4 + Konva). All calculations run client-side in millimeters; projects persist in `localStorage`.

## Requirements

- Node.js 22+
- pnpm 10+

## Local development

```bash
pnpm install
pnpm run dev
```

Open http://localhost:3000

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Development server |
| `pnpm run build` | Production build |
| `pnpm run preview` | Preview production build |
| `pnpm run test` | Vitest unit tests |
| `pnpm run test:e2e` | Playwright E2E tests |
| `pnpm run lint` | ESLint |
| `pnpm run typecheck` | Vue/TS type check |

## Docker

```bash
docker compose up --build
```

App: http://localhost:3000

## Vercel

The project uses the Nuxt `vercel` Nitro preset. Connect the repo and use the default Nuxt build settings (`vercel.json` included).

## Architecture

- `shared/` — Pure TypeScript domain model, Zod schemas, calculation engine (no Vue/Konva)
- `app/stores/` — Pinia: project (persistent), editor (transient), history (undo/redo)
- `app/components/` — Canvas (Konva), inspector, optimizer, preview
- `tests/unit/` — Calculation tests
- `tests/e2e/` — Playwright flows

Panel presets include generic examples (not verified commercial specs) and Jinyuan P3.91 quote panels.

The default project compares two 4 × 2.5 m offers with identical layouts: Jinyuan P3.91 and P2.6, each with 16 cabinets of 500 × 1000 mm and 8 cabinets of 500 × 500 mm. The P2.6 calculation model assumes 192 pixels per 500 mm (192 × 192 / 192 × 384); exact supplier resolutions can be edited in the panel library. Load these defaults for an existing browser project through settings → **Standardangebote laden**.

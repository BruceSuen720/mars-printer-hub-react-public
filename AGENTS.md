# AGENTS.md

## Project Overview

Mars Printer Hub is a 3D printer and filament (spool) management web application. The React frontend communicates with a backend API (Java/Spring, served at `/api`) and supports device monitoring via Bambu MQTT and SSE real-time connections.

## Tech Stack

- **Framework:** React 19 + TypeScript 5.9
- **Build:** Vite 7 with SWC plugin
- **Styling:** Tailwind CSS 4 (Vite plugin) + shadcn/ui (new-york style, Radix UI primitives)
- **State:** Zustand (stores in `src/stores/`)
- **Routing:** react-router-dom v7 (createBrowserRouter, lazy-loaded views)
- **Forms:** react-hook-form + zod validation
- **HTTP:** Axios with custom interceptors (`src/request.ts`)
- **Charts:** ECharts (echarts-for-react) + Recharts
- **Icons:** lucide-react
- **PWA:** vite-plugin-pwa (auto-update service worker)
- **Deployment:** Nginx in Docker (static dist served)

## Architecture

```
src/
├── api/            # Auto-generated API client from OpenAPI (via @umijs/openapi)
├── components/
│   ├── ui/         # shadcn/ui primitives (do not edit manually)
│   ├── home/       # Home page components
│   ├── printer/    # Printer-related components
│   ├── spool/      # Spool/filament components
│   └── user/       # User components
├── config/         # Feature flags
├── hooks/          # Custom React hooks
├── layouts/        # BasicLayout (main app shell with nav)
├── lib/            # Utility functions (cn, etc.)
├── router/         # Route definitions (single index.tsx)
├── services/       # Non-generated services (e.g. version check)
├── stores/         # Zustand stores (device, theme, layout, user, SSE, etc.)
├── types/          # TypeScript type definitions
├── utils/          # Shared utilities
└── views/          # Page components organized by domain
    ├── auth/       # Login, register, setup, license
    ├── device/     # Device manage & overview
    ├── home/       # Dashboard
    ├── order/      # Order management
    ├── spool/      # Spool manage, detail, records, summary
    ├── system/     # System config, notifications, logs
    └── user/       # User center, preferences, manage
```

## Build & Dev Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 5173, proxies `/api` to backend) |
| `npm run build` | Type-check (`tsc -b`) then Vite build |
| `npm run lint` | ESLint (flat config, TS + React hooks + React Refresh) |
| `npm run openapi` | Regenerate API client from OpenAPI spec (requires backend at localhost:8123) |
| `npm run preview` | Preview production build locally |

## Key Conventions

- **Path alias:** `@/` maps to `src/` (configured in tsconfig + Vite)
- **API layer:** Auto-generated from OpenAPI spec. Run `npm run openapi` to regenerate. Do NOT manually edit files in `src/api/` except `objectStorage.ts` (preserved across regeneration).
- **UI components:** Use shadcn/ui from `@/components/ui/`. Install new components via `npx shadcn add <component>`.
- **State management:** One Zustand store per domain concern. Import selectors directly: `useStore((s) => s.field)`.
- **Views:** Each view is a lazy-loaded page component in `src/views/<domain>/<feature>/`. Named as `<Feature>View.tsx`.
- **Responsive:** Mobile detection via `useDeviceStore.isMobile`. Theme varies by device type (desktop/mobile).
- **Language:** UI text is in Chinese (zh-CN). Code (variables, comments in code) can be in English or Chinese.
- **API response format:** Backend wraps responses in `{ code, data, message }`. Code `0` = success, `40100` = unauthorized, `9999` = unlicensed.
- **Feature flags:** Controlled in `src/config/featureFlags.ts` for conditional route/feature visibility.
- **Design system:** Vercel-inspired minimal aesthetic (see DESIGN.md). Uses CSS variables for theming with dark mode support via `next-themes` pattern.
- **No test framework** is currently configured.

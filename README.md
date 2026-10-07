# Skill-Archive

A Replit workspace export whose main workspace was never built out, but which contains a real mobile app artifact: **NEXUS — Cyber Operations Hub**.

## Features (NEXUS mobile artifact, `artifacts/mobile`)

- Tabbed Expo app: **Nodes** (remote-node management with SSH / WebRTC / WireGuard protocols and linux/macOS/Windows/Android/iOS targets), **Vault**, **Terminal**, **Feed**, and **ARIA** (chat)
- React Native UI with Inter fonts, animated stat bars, error boundary

## Tech stack

- Mobile: Expo / React Native, React Query, TypeScript (`artifacts/mobile`)
- Workspace template: pnpm workspaces, Node.js 24, TypeScript 5.9, Express 5 skeleton, PostgreSQL + Drizzle scaffolding, Zod (`zod/v4`), Orval codegen, Replit auth web lib (`lib/replit-auth-web`)

## Getting started

- Workspace root: `pnpm run typecheck`, `pnpm run build`
- The mobile app is an Expo project under `artifacts/mobile/`; run it with the standard Expo workflow (Expo CLI) from that directory

## Project structure

- `artifacts/mobile/` — NEXUS app (app router: `app/(tabs)/` = index, chat, feed, terminal, vault; `components/`)
- `artifacts/api-server/` — unbuilt Express skeleton
- `artifacts/mockup-sandbox/` — empty UI sandbox
- `lib/` — shared `api-spec`, `api-client-react`, `api-zod`, `db`, `replit-auth-web`
- `.agents/agent_assets_metadata.toml` — agent asset metadata

## Status

Mixed: the top-level workspace and API are still empty template (placeholder `replit.md`); the `artifacts/mobile` app is real code. Judgment call — if you want this repo to represent the NEXUS app, the mobile artifact is what to keep.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies from `package-lock.json`.
- `npm run check` — run TypeScript type checking (`tsc --noEmit`).
- `npm run build` — build ESM output into `build/` with tsup.
- `npm run dev` — run the bot from `src/index.ts` with `.env`.
- `npm run dev:dev` — run the bot from `src/index.ts` with `.env.dev`.
- `npm run watch` — run the bot in watch mode with `.env`.
- `npm run watch:dev` — run the bot in watch mode with `.env.dev`.
- `npm start` — run the compiled bot via `node --env-file=.env .` using `package.json` `main` (`build/index.js`).
- `npm run start:dev` — run the compiled bot with `.env.dev`.

There is currently no test runner, lint script, or single-test command configured. Use `npm run check` as the primary validation command unless a test framework is added.

## Runtime requirements and environment

- Node.js 20.12 or higher is required.
- `.env` must provide `BOT_TOKEN` for the Discord bot.
- `WEBHOOK_LOGS_URL` and `GUILD_ID` are optional environment variables accepted by `src/env.ts`.
- `.env.example` currently lists `BOT_TOKEN` and `NODE_OPTIONS`.

## Architecture

This is a TypeScript ESM Discord bot based on `@constatic/base`, `discord.js`, and `@magicyan/discord`.

- `src/index.ts` is the entrypoint. It imports validated environment config from `#env` and calls `bootstrap({ meta: import.meta, env })` from `@constatic/base`.
- `src/env.ts` validates environment variables with Zod through `validateEnv()` and imports `src/constants.ts` for global constant setup.
- `src/constants.ts` loads `constants.json` as JSON and exposes it as a frozen global `constants` object. Shared colors live in `constants.json`.
- `src/discord/index.ts` calls `setupCreators()` and exports `createCommand`, `createEvent`, and `createResponder`; bot modules should use these helpers via `#base`.
- Discord commands live under `src/discord/commands/`. Public slash commands are currently in `src/discord/commands/public/`.
- Responders live under `src/discord/responders/`, grouped by interaction type such as `buttons/`. Responder `customId` patterns can include params (for example `remind/:date` or `counter/:current`) and may parse params with Zod or custom parse functions.
- Events live under `src/discord/events/` and should be created with `createEvent`.
- `src/functions/index.ts` is reserved for exported shared functions.

## TypeScript and path aliases

- `tsconfig.json` extends `@constatic/base/tsconfig`, uses `src` as `rootDir`, and emits to `build`.
- Development aliases in `tsconfig.json` map `#env`, `#base`, `#functions`, `#database`, `#server`, `#menus`, `#tools`, `#lib/*`, `#shared/*`, `#types/*`, and `#emojis` to source files.
- Runtime package imports in `package.json` map the same aliases to built files under `build/`. Keep these alias maps aligned when adding new top-level modules.

## Build behavior

`tsup.config.ts` builds every `src/**/*.ts` file except declaration, `.spec.ts`, and `.test.ts` files. The build outputs unbundled ESM files to `build/`, cleans the output directory first, disables code splitting, and targets `esnext`.

## Project notes from README

The README identifies this as an “Awesome Bot Base” generated from the Constant CLI / Constatic Discord base. The primary structures are commands, responders, and events; refer to the Constatic Discord documentation linked in the README for framework-specific patterns.

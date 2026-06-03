# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-04

First complete release of the framework.

### Core

- **Common utilities** under `core/common/`, exposed through `common.core.js`:
  `Arr`, `Str`, `Obj`, `Url`, `Path`, `Hash`, `Crypt`, `Collection`, `Date`
  (Carbon-like), `Cache` (in-memory TTL) and `Storage` (filesystem). Generic
  helpers `sleep`, `isEmpty` and `attempt`.
- **Database core** — Sequelize integration with automatic model loading from
  `src/models`, schema sync (`force` / `alter`), and a migration/seeder runner
  with `migrate`, `rollback`, `reset`, `fresh` and `seed`. Migrations are tracked
  in a `sequelize_meta` table. Model scaffolding via `generateModels` /
  `makeModel`, run automatically after `migrate` when `DB_AUTO_MODEL=true`.
  The whole subsystem can be turned off with `DB_ENABLED=false`.
- **Express core** — HTTP backbone assembling helmet, CORS, compression, rate
  limiting and body parsing, a global middleware registrar
  (`src/http/middleware/register.middleware.js`), the express-routing route
  table, a shared `http.Server`, and a multer upload helper.
- **JWT core** — access/refresh token signing and verification, combined
  `issue()`, non-throwing `tryVerify`, plus `decode`, `expiresAt`, `isExpired`
  and `fromHeader` helpers.
- **Response core** — one standard response envelope
  (`{ status, code, message, data, meta, errors, additional }`) for the whole
  app, with `res.success` / `res.error` / `res.respond` decorators and static
  `build` / `send` helpers. Validation failures and errors use it automatically.
- **Validator core** — converts a Zod schema into an express-routing middleware
  (`Validator.make(schema, source)`) emitting the standard 422 envelope.
- **Mailer core** — nodemailer wrapper with a lazy, cached SMTP transport and a
  no-op mode when `MAIL_ENABLED=false`.
- **Cron core** — `node-cron`-based scheduler driven by
  `src/jobs/register.job.js`, with timezone support and graceful stop.
- **Queue core** — dependency-free in-process job queue with bounded
  concurrency, retry-with-backoff and delayed dispatch, driven by
  `src/queue/register.queue.js`.
- **Socket core** — Socket.IO server sharing the Express HTTP server, driven by
  `src/socket/register.socket.js`, with `broadcast` and `toRoom` helpers.
- **Hooks core** — `before` / `after` / `shutdown` lifecycle stages wired to
  `src/hooks/register.hook.js`.
- **Bootstrap orchestration** — deterministic boot order across all cores plus a
  graceful shutdown handler for `SIGINT` / `SIGTERM`.

### Application & tooling

- Centralized configuration in `src/config.js` covering `app`, `database`,
  `jwt`, `bcrypt`, `cors`, `express`, `rateLimit`, `upload`, `axios`, `logging`,
  `runtime`, `storage`, `cache`, `cron`, `queue`, `socket` and `mail`. Every key
  maps to a documented environment variable; subsystems toggle via `DB_ENABLED`,
  `CRON_ENABLED`, `QUEUE_ENABLED`, `SOCKET_ENABLED` and `MAIL_ENABLED`.
- `src/http/` layer split into `controllers`, `middleware` and `validator`.
- Project scaffolder (`bin/create.js`, the `create-rfbe` initializer) so a new
  app can be created with `npm create rfbe@latest my-app` or
  `npx degit refkinscallv/rfbe my-app`. Supports `--no-install` / `--no-git`.
- Packaging metadata for publishing and consumption: package published as
  `create-rfbe`, plus `bin`, `files`, `engines.node >= 18`, `.gitignore` and
  `.gitattributes`.
- GitHub Actions: `ci.yml` (lint + boot smoke on Node 18/20/22 for pushes and
  PRs) and `publish.yml` (publishes to npm on a GitHub Release).
- Database CLI (`scripts/db.js`) with npm scripts: `db:migrate`, `db:rollback`,
  `db:reset`, `db:fresh`, `db:seed`, `db:sync` and `db:make:model`.
- `scripts/setup.js` generates `APP_KEY`, `JWT_SECRET` and `JWT_REFRESH_SECRET`.
- Example application: home controller, route table demonstrating validation and
  an auth guard, a `User` model, a migration, a seeder, and `_sample.hook.js`.
- Documentation: `README.md`, `API.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `LICENSE` and this changelog.

### Fixed

- CORS now disables `credentials` automatically when the origin is `*` (browsers
  reject credentialed requests against a wildcard origin) — applied to both the
  HTTP and Socket.IO layers.
- File-upload rejections for disallowed MIME types now surface as `400` instead
  of `500`.

### Dependencies

- express, @refkinscallv/express-routing, sequelize + mysql2, jsonwebtoken,
  bcrypt, node-cron, socket.io, nodemailer, helmet, cors, compression,
  express-rate-limit, multer, axios, winston + winston-daily-rotate-file, zod,
  dotenv, module-alias.
